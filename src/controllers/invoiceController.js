import prisma from "../prismaClient.js"


/* ================= CREATE ================= */
export const createInvoice = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false })

    const items = req.body.items.map(item => ({
      ...item,
      subtotal: item.price * item.quantity
    }))

    const total = items.reduce((s, i) => s + i.subtotal, 0)

    let status = "unpaid"
    let remainingAmount = total - (req.body.paidAmount || 0)

    if (req.body.paidAmount >= total) {
      status = "paid"
      remainingAmount = 0
    } else if (req.body.paidAmount > 0) {
      status = "partial"
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-" + Date.now(),
        clientPhone: req.body.clientPhone,
        paidAmount: req.body.paidAmount || 0,
        paymentMethod: req.body.paymentMethod,
        note: req.body.note,
        total,
        remainingAmount,
        status,
        userId: req.user.id,
        items: {
          create: items
        }
      },
      include: { items: true }
    })

    res.status(201).json({ success: true, data: invoice })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/* ================= LIST ================= */
export const getInvoices = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false })

    const page = Number(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    const where = { userId: req.user.id }

    if (req.query.status) where.status = req.query.status
    if (req.query.paymentMethod) where.paymentMethod = req.query.paymentMethod

    if (req.query.clientPhone) {
      where.clientPhone = { contains: req.query.clientPhone, mode: "insensitive" }
    }

    if (req.query.invoiceNumber) {
      where.invoiceNumber = { contains: req.query.invoiceNumber, mode: "insensitive" }
    }

    if (req.query.dateFilter) {
      const now = new Date()
      let start

      switch (req.query.dateFilter) {
        case "today":
          start = new Date(); start.setHours(0,0,0,0)
          break
        case "thisWeek":
          start = new Date(); start.setDate(start.getDate() - start.getDay())
          break
        case "thisMonth":
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "lastMonth":
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          break
        case "last3Months":
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          break
      }

      if (start) where.createdAt = { gte: start }
    }

    const orderBy = req.query.sort === "oldest"
      ? { createdAt: "asc" }
      : { createdAt: "desc" }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { items: true }
      })
    ])

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/* ================= UPDATE ================= */
export const updateInvoice = async (req, res) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
      include: { items: true }
    })

    if (!existing) return res.status(404).json({ success: false })

    let items = existing.items

    if (req.body.items) {
      await prisma.item.deleteMany({ where: { invoiceId: existing.id } })

      items = req.body.items.map(i => ({
        ...i,
        subtotal: i.price * i.quantity
      }))
    }

    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const paid = req.body.paidAmount ?? existing.paidAmount

    let status = "unpaid"
    let remainingAmount = total - paid

    if (paid >= total) {
      status = "paid"
      remainingAmount = 0
    } else if (paid > 0) {
      status = "partial"
    }

    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        clientPhone: req.body.clientPhone,
        paidAmount: paid,
        paymentMethod: req.body.paymentMethod,
        note: req.body.note,
        total,
        remainingAmount,
        status,
        items: req.body.items
          ? { create: items }
          : undefined
      },
      include: { items: true }
    })

    res.json({ success: true, data: invoice })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}


/* ================= DELETE ================= */
export const deleteInvoice = async (req, res) => {
  try {
    const deleted = await prisma.invoice.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id }
    })

    if (!deleted.count) return res.status(404).json({ success: false })

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
