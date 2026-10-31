import Inventory from "../models/Inventory.js";
import { recordActivity } from "../services/activityLog.js";

export async function listInventory(req, res) {
  const items = await Inventory.find({ hotel: req.user.hotel._id })
    .sort({ name: 1 })
    .limit(1000);
  res.json({
    items: items.map((item) => ({
      ...item.toObject(),
      lowStock: item.quantity <= item.reorderLevel,
    })),
  });
}

export async function createInventoryItem(req, res) {
  const { name, quantity = 0, reorderLevel = 0, cost = 0 } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Number.isFinite(Number(quantity)) ||
    Number(quantity) < 0 ||
    !Number.isFinite(Number(reorderLevel)) ||
    Number(reorderLevel) < 0 ||
    !Number.isFinite(Number(cost)) ||
    Number(cost) < 0
  )
    return res.status(400).json({ message: "Enter a valid inventory name, quantity and cost" });
  const item = await Inventory.create({
    ...req.body,
    hotel: req.user.hotel._id,
    name: name.trim(),
    quantity: Number(quantity),
    reorderLevel: Number(reorderLevel),
    cost: Number(cost),
  });
  await recordActivity(req, "inventory.created", "Inventory", item._id, {
    name: item.name,
    quantity: item.quantity,
  });
  res.status(201).json({ item });
}

export async function adjustInventory(req, res) {
  const adjustment = Number(req.body.adjustment);
  if (!Number.isFinite(adjustment) || adjustment === 0)
    return res.status(400).json({ message: "Enter a non-zero stock adjustment" });
  const item = await Inventory.findOne({
    _id: req.params.id,
    hotel: req.user.hotel._id,
  });
  if (!item) return res.status(404).json({ message: "Inventory item not found" });
  const quantity = item.quantity + adjustment;
  if (quantity < 0)
    return res.status(409).json({ message: "Stock cannot be adjusted below zero" });
  item.quantity = quantity;
  await item.save();
  await recordActivity(req, "inventory.adjusted", "Inventory", item._id, {
    adjustment,
    quantity,
    reason: typeof req.body.reason === "string" ? req.body.reason.trim() : "",
  });
  res.json({ item });
}
