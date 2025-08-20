require('dotenv').config({ path: './.env' });

const fetch = require('node-fetch');
const cron = require('node-cron');

const API_BASE_URL = "http://api.ahlan.uz";
const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300";

const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN;

if (!ADMIN_ACCESS_TOKEN) {
    console.error("XATOLIK: .env faylida ADMIN_ACCESS_TOKEN topilmadi!");
    process.exit(1);
}

async function sendTelegramMessage(htmlMessage) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: htmlMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        const result = await response.json();
        if (result.ok) {
            console.log("Kunlik hisobot muvaffaqiyatli yuborildi!");
        } else {
            console.error("Telegramga yuborishda xatolik:", result.description);
        }
    } catch (error) {
        console.error("Hisobotni yuborishda xatolik:", error);
    }
}

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${ADMIN_ACCESS_TOKEN}` }
        });
        if (!response.ok) {
            console.error(`Xatolik: ${endpoint} so'rovida xato (${response.status} ${response.statusText})`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Istisno: ${endpoint} so'rovida xato:`, error);
        return null;
    }
}

async function generateAndSendDailyReport() {
    console.log('Kunlik hisobot yaratilmoqda...');
    const today = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
    let reportMessage = `<b>📊 ${today} uchun kunlik hisobot</b>\n\n`;

    try {
        const apartmentsData = await fetchData('/apartments/?page_size=10000');
        if (apartmentsData && apartmentsData.results) {
            const statsByObject = apartmentsData.results.reduce((acc, apt) => {
                const objectName = apt.object_name || "Noma'lum Obyekt";
                if (!acc[objectName]) {
                    acc[objectName] = { sotilgan: 0, band: 0, muddatli: 0, bosh: 0 };
                }
                const status = apt.status.toLowerCase();
                if (status === 'sotilgan' || status === 'paid') acc[objectName].sotilgan++;
                else if (status === 'band') acc[objectName].band++;
                else if (status === 'muddatli') acc[objectName].muddatli++;
                else if (status === 'bosh') acc[objectName].bosh++;
                return acc;
            }, {});
            reportMessage += "<b>🏢 Xonadonlar holati:</b>\n";
            for (const [objectName, stats] of Object.entries(statsByObject)) {
                reportMessage += `• <b>${objectName}:</b>\n`;
                reportMessage += `  - Sotilgan: ${stats.sotilgan} ta\n`;
                reportMessage += `  - Band: ${stats.band} ta\n`;
                reportMessage += `  - Muddatli: ${stats.muddatli} ta\n`;
                reportMessage += `  - Bo'sh: ${stats.bosh} ta\n`;
            }
            reportMessage += "\n";
        }

        const paymentsData = await fetchData('/payments/?page_size=10000');
        if (paymentsData && paymentsData.results) {
            const totalPaid = paymentsData.results.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
            const muddatliPaid = paymentsData.results
                .filter(p => p.payment_type === 'muddatli')
                .reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
            reportMessage += "<b>💰 To'lovlar:</b>\n";
            reportMessage += `• Umumiy tushum: <code>${totalPaid.toLocaleString('en-US')} $</code>\n`;
            reportMessage += `• Muddatli to'lovlar: <code>${muddatliPaid.toLocaleString('en-US')} $</code>\n\n`;
        }

        const expensesData = await fetchData('/expenses/?page_size=10000');
        if (expensesData && expensesData.results) {
            let totalExpense = 0;
            let paidExpense = 0;
            expensesData.results.forEach(exp => {
                const amount = parseFloat(exp.amount || 0);
                totalExpense += amount;
                if (exp.status === 'To‘langan') {
                    paidExpense += amount;
                }
            });
            const nasiyaExpense = totalExpense - paidExpense;
            reportMessage += "<b>💸 Xarajatlar:</b>\n";
            reportMessage += `• Umumiy xarajatlar: <code>${totalExpense.toLocaleString('en-US')} $</code>\n`;
            reportMessage += `• To'langan: <code>${paidExpense.toLocaleString('en-US')} $</code>\n`;
            reportMessage += `• Nasiya (Qoldiq): <code>${nasiyaExpense.toLocaleString('en-US')} $</code>\n\n`;
        }
        
        const debtorsData = await fetchData('/users/?user_type=mijoz&page_size=10000');
        if (debtorsData && debtorsData.results) {
            const totalDebt = debtorsData.results
                .filter(u => u.fio && u.fio.includes('(Qarzdor)'))
                .reduce((sum, user) => sum + parseFloat(user.balance || 0), 0);
            reportMessage += "<b>👤 Qarzdorlar:</b>\n";
            reportMessage += `• Umumiy qarzdorlik: <code>${totalDebt.toLocaleString('en-US')} $</code>\n`;
        }
    } catch (error) {
        reportMessage += "❗️ Hisobotni yaratishda xatolik yuz berdi.";
        console.error(error);
    }
    
    console.log("\n--- TELEGRAMGA YUBORILADIGAN XABAR ---\n");
    console.log(reportMessage.replace(/<b>|<\/b>|<code>|<\/code>/g, ''));
    console.log("\n-------------------------------------\n");
    
    await sendTelegramMessage(reportMessage);
}

// Izohdan ochib qo'ying (remove the /* and */)
cron.schedule('0 7 * * *', generateAndSendDailyReport, {
  scheduled: true,
  timezone: "UTC"
});

// generateAndSendDailyReport(); // <-- BU QATORNI O'CHIRING YOKI IZOHGA OLING

generateAndSendDailyReport();