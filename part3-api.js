app.get("/api/companies/:companyId/alerts/low-stock", async (req, res) => {
  try {
    const { companyId } = req.params;

    const warehouses = await Warehouse.find({ companyId });

    const alerts = [];

    for (let i = 0; i < warehouses.length; i++) {
      const warehouse = warehouses[i];
      const inventories = await Inventory.find({
        warehouseId: warehouse._id,
      }).populate("productId");

      for (let j = 0; j < inventories.length; j++) {
        const inv = inventories[j];
        const product = inv.productId;

        if (!product) continue;

        const threshold = product.threshold || 10;
        if (inv.quantity >= threshold) continue;

        // Check recent sales (last 30 days)
        const recentSale = await Sales.findOne({
          productId: product._id,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        });

        if (!recentSale) continue;

        const supplierLink = await ProductSupplier.findOne({
          productId: product._id,
        }).populate("supplierId");

        const supplier = supplierLink ? supplierLink.supplierId : null;

        // Add alert
        alerts.push({
          product_id: product._id,
          product_name: product.name,
          sku: product.sku,
          warehouse_id: warehouse._id,
          warehouse_name: warehouse.name,
          current_stock: inv.quantity,
          threshold: threshold,
          days_until_stockout: Math.floor(inv.quantity / 1),
          supplier: supplier
            ? {
                id: supplier._id,
                name: supplier.name,
                contact_email: supplier.contactEmail,
              }
            : null,
        });
      }
    }

    res.json({
      alerts: alerts,
      total_alerts: alerts.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
