import prisma from "../prismaClient.js"


/* ================= date range helper ================= */

const getStartDate = (range) => {
  const now = new Date();

  switch (range) {
    case "week":
      const week = new Date();
      week.setDate(week.getDate() - week.getDay());
      return week;

    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);

    case "lastMonth":
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);

    case "last3":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);

    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
};

/* ================= MAIN DASHBOARD ================= */

export const getDashboard = async (req, res) => {
  try {
    const range = req.query.range || "month"
    const startDate = getStartDate(range)

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: "asc" }
    })

    /* ================= STATS ================= */

    const totalInvoices = invoices.length

    let totalIncome = 0
    let unpaidBalance = 0

    const statusCount = {
      paid: 0,
      partial: 0,
      unpaid: 0
    }

    invoices.forEach(inv => {
      totalIncome += inv.paidAmount
      unpaidBalance += inv.remainingAmount
      statusCount[inv.status]++
    })

    const statusPercent = {
      paid: totalInvoices ? Math.round((statusCount.paid / totalInvoices) * 100) : 0,
      partial: totalInvoices ? Math.round((statusCount.partial / totalInvoices) * 100) : 0,
      unpaid: totalInvoices ? Math.round((statusCount.unpaid / totalInvoices) * 100) : 0
    }

    /* ================= CHARTS ================= */

    const incomeMap = {}
    const invoiceMap = {}

    invoices.forEach(inv => {
      const day = inv.createdAt.toISOString().split("T")[0]

      if (!incomeMap[day]) {
        incomeMap[day] = 0
        invoiceMap[day] = 0
      }

      incomeMap[day] += inv.paidAmount
      invoiceMap[day] += 1
    })

    const chartLabels = Object.keys(incomeMap)

    const incomeValues = chartLabels.map(d => incomeMap[d])
    const invoiceValues = chartLabels.map(d => invoiceMap[d])

    /* ================= RECENT ================= */

    const recentInvoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        invoiceNumber: true,
        clientPhone: true,
        total: true,
        status: true
      }
    })

    res.json({
      success: true,
      data: {
        stats: {
          totalIncome,
          unpaidBalance,
          totalInvoices,
          status: statusPercent
        },

        charts: {
          income: {
            labels: chartLabels,
            values: incomeValues
          },
          invoices: {
            labels: chartLabels,
            values: invoiceValues
          }
        },

        recentInvoices
      }
    })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
