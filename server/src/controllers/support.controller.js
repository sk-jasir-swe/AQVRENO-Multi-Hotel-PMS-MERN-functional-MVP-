import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";

export async function createTicket(req, res) {
  const { category = "issue", subject, message } = req.body;
  if (!["issue", "feedback", "other"].includes(category))
    return res.status(400).json({ message: "Select a valid request type" });
  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    subject.trim().length > 120
  )
    return res.status(400).json({
      message: "Subject is required and must be 120 characters or fewer",
    });
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > 5000
  )
    return res.status(400).json({
      message: "Details are required and must be 5000 characters or fewer",
    });
  if (!req.user.hotel)
    return res.status(403).json({ message: "A hotel account is required" });

  const ticket = await SupportTicket.create({
    hotel: req.user.hotel._id,
    submittedBy: req.user._id,
    category,
    subject: subject.trim(),
    message: message.trim(),
  });
  res.status(201).json({ ticket, message: "Your request was sent to support" });
}

export async function hotelTicketsList(req, res) {
  const tickets = await SupportTicket.find({ hotel: req.user.hotel._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("replies.author", "name role");
  res.json({ tickets });
}

export async function replyToTicket(req, res) {
  const message =
    typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 5000)
    return res.status(400).json({
      message: "Reply is required and must be 5000 characters or fewer",
    });
  const query =
    req.user.role === "super_admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, hotel: req.user.hotel._id };
  const update = {
    $push: {
      replies: {
        author: req.user._id,
        role: req.user.role,
        message,
        createdAt: new Date(),
      },
    },
  };
  if (req.user.role === "super_admin") update.$set = { status: "in_progress" };
  const ticket = await SupportTicket.findOneAndUpdate(query, update, {
    new: true,
    runValidators: true,
  })
    .populate(
      "hotel",
      "name email phone phoneCountryCode address city country gstin status",
    )
    .populate("submittedBy", "name email role")
    .populate("replies.author", "name role");
  if (!ticket)
    return res.status(404).json({ message: "Support request not found" });
  res.json({ ticket });
}

export async function supportTicketsList(req, res) {
  const tickets = await SupportTicket.find()
    .sort({ createdAt: -1 })
    .limit(500)
    .populate(
      "hotel",
      "name email phone phoneCountryCode address city country gstin status",
    )
    .populate("submittedBy", "name email role")
    .populate("replies.author", "name role");
  const hotelIds = [
    ...new Set(
      tickets
        .map((ticket) => ticket.hotel?._id?.toString())
        .filter(Boolean),
    ),
  ];
  const owners = await User.find({
    hotel: { $in: hotelIds },
    role: "hotel_owner",
  })
    .select("hotel name email")
    .lean();
  const ownerByHotel = new Map(
    owners.map((owner) => [owner.hotel.toString(), owner]),
  );
  res.json({
    tickets: tickets.map((ticket) => ({
      ...ticket.toObject(),
      owner: ownerByHotel.get(ticket.hotel?._id?.toString()) || null,
    })),
  });
}

export async function updateTicketStatus(req, res) {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved"].includes(status))
    return res.status(400).json({ message: "Select a valid support status" });
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true },
  )
    .populate(
      "hotel",
      "name email phone phoneCountryCode address city country gstin status",
    )
    .populate("submittedBy", "name email role")
    .populate("replies.author", "name role");
  if (!ticket)
    return res.status(404).json({ message: "Support request not found" });
  const owner = await User.findOne({
    hotel: ticket.hotel._id,
    role: "hotel_owner",
  }).select("hotel name email");
  res.json({ ticket: { ...ticket.toObject(), owner } });
}
