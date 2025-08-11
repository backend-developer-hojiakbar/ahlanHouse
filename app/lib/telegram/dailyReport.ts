import axios from 'axios';
import { format } from 'date-fns';

const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_IDS = ["1728300", "1253428560"];

interface DailyReportData {
  debtors: {
    totalDebt: number;
  };
  apartments: {
    vacant: number;
    sold: number;
    reserved: number;
    installment: number;
  };
  payments: {
    totalPayments: number;
    remainingBalance: number;
  };
  expenses: {
    totalExpenses: number;
    paid: number;
    outstanding: number;
  };
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0
  }).format(num);
};

const createReportMessage = (data: DailyReportData): string => {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  
  return `📅 ${currentDate} - KUNLIK HISPOLAT

💰 QARZDORLAR
Umumiy qarzdorlik: ${formatNumber(data.debtors.totalDebt)}

🏢 XONADONLAR
Bo'sh: ${data.apartments.vacant} ta
Sotilgan: ${data.apartments.sold} ta
Band: ${data.apartments.reserved} ta
Muddatli: ${data.apartments.installment} ta

📊 TO'LOVLAR
Umumiy to'lovlar: ${formatNumber(data.payments.totalPayments)}
Qoldiq: ${formatNumber(data.payments.remainingBalance)}

📊 XARAJATLAR
Umumiy xarajatlar: ${formatNumber(data.expenses.totalExpenses)}
To'langan: ${formatNumber(data.expenses.paid)}
Nasiya: ${formatNumber(data.expenses.outstanding)}`;
};

const sendTelegramReport = async (reportData: DailyReportData) => {
  const message = createReportMessage(reportData);
  
  // Log the full report message to terminal
  console.log('\n=== DAILY REPORT MESSAGE ===');
  console.log(message);
  console.log('============================\n');
  
  try {
    for (const chatId of TELEGRAM_CHAT_IDS) {
      console.log(`Attempting to send report to chat ID: ${chatId}`);
      try {
        await axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          }
        );
        console.log(`Successfully sent report to chat ID: ${chatId}`);
      } catch (error) {
        console.error(`Error sending to chat ID ${chatId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending Telegram report:', error);
  }

  // Always return success even if Telegram failed, since we've already logged the message
  return true;
};

export const generateDailyReport = async () => {
  try {
    // API calls to fetch data
    const [debtorsData, apartmentsData, paymentsData, expensesData] = await Promise.all([
      fetchDebtorsData(),
      fetchApartmentsData(),
      fetchPaymentsData(),
      fetchExpensesData()
    ]);

    const reportData: DailyReportData = {
      debtors: {
        totalDebt: debtorsData.totalDebt
      },
      apartments: {
        vacant: apartmentsData.vacant,
        sold: apartmentsData.sold,
        reserved: apartmentsData.reserved,
        installment: apartmentsData.installment
      },
      payments: {
        totalPayments: paymentsData.totalPayments,
        remainingBalance: paymentsData.remainingBalance
      },
      expenses: {
        totalExpenses: expensesData.totalExpenses,
        paid: expensesData.paid,
        outstanding: expensesData.outstanding
      }
    };

    // Get the report message first
    const message = createReportMessage(reportData);
    
    // Always print to console first
    console.log('\n=== DAILY REPORT MESSAGE ===');
    console.log(message);
    console.log('============================\n');

    // Then try to send to Telegram
    await sendTelegramReport(reportData);
    
    // Always return success since we've logged the message
    return true;
  } catch (error) {
    console.error('Error generating daily report:', error);
    return false;
  }
};

// Helper functions to fetch data from APIs
const fetchDebtorsData = async () => {
  // Implement API call to fetch debtors data
  const response = await axios.get('http://api.ahlan.uz/api/debtors/total');
  return response.data;
};

const fetchApartmentsData = async () => {
  // Implement API call to fetch apartments data
  const response = await axios.get('http://api.ahlan.uz/api/apartments/status');
  return response.data;
};

const fetchPaymentsData = async () => {
  // Implement API call to fetch payments data
  const response = await axios.get('http://api.ahlan.uz/api/payments/summary');
  return response.data;
};

const fetchExpensesData = async () => {
  // Implement API call to fetch expenses data
  const response = await axios.get('http://api.ahlan.uz/api/expenses/summary');
  return response.data;
};
