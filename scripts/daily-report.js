require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const { format } = require('date-fns');

const API_BASE_URL = 'http://api.ahlan.uz';
const TELEGRAM_BOT_TOKEN = '7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s';
const TELEGRAM_CHAT_ID = '1728300';
// Iltimos, quyidagi ma'lumotlarni o'z hisobingiz bilan almashtiring:
const ADMIN_USERNAME = '+998937017777';  // Telefon raqamingizni kiriting
const ADMIN_PASSWORD = 'ahadjon';  // Parolingizni kiriting

let tokens = {
  access: '',
  refresh: ''
};

// Function to authenticate and get tokens
async function authenticate() {
  try {
    const response = await axios.post(`${API_BASE_URL}/login/`, 
      {
        phone_number: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      },
      {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.access) {
      tokens = {
        access: response.data.access,
        refresh: response.data.refresh
      };
      console.log('Muvaffaqiyatli tizimga kirildi');
      return true;
    }
    console.error('Kirishda xatolik:', response.data);
    return false;
  } catch (error) {
    console.error('Kirishda xatolik yuz berdi:');
    console.error('API manzili:', API_BASE_URL);
    console.error('Foydalanuvchi nomi:', ADMIN_USERNAME);
    console.error('Xatolik tafsilotlari:', error.response?.data || error.message);
    console.error('\nIltimos, quyidagilarni tekshiring:');
    console.error('1. API manzili to\'g\'ri ekanligini tekshiring');
    console.error('2. Foydalanuvchi nomi va parol to\'g\'ri ekanligini tekshiring');
    console.error('3. Internet aloqasi borligiga ishonch hosil qiling');
    return false;
  }
}

// Function to make authenticated requests
async function fetchWithAuth(url) {
  try {
    console.log(`So'rov yuborilmoqda: ${url}...`);
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('Token yangilanmoqda...');
      const authenticated = await refreshToken();
      if (authenticated) {
        return fetchWithAuth(url);
      }
      throw new Error('Qayta autentifikatsiya amalga oshmadi');
    }
    console.error('Ma\'lumot olishda xatolik:', error.message);
    throw error;
  }
}

// Function to refresh access token
async function refreshToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
      refresh: tokens.refresh
    });
    
    if (response.data.access) {
      tokens.access = response.data.access;
      console.log('Token muvaffaqiyatli yangilandi');
      return true;
    }
  } catch (error) {
    console.error('Tokenni yangilashda xatolik:', error.message);
    // If refresh fails, try to login again
    return await authenticate();
  }
  return false;
}

// Function to send message to Telegram
async function sendTelegramMessage(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return false;
  }
}

// Function to get current date in YYYY-MM-DD format
function getCurrentDate() {
  return format(new Date(), 'yyyy-MM-dd');
}

// Main function to generate and send the daily report
async function generateDailyReport() {
  try {
    const authenticated = await authenticate();
    if (!authenticated) {
      throw new Error('Authentication failed');
    }

    // 1. Get apartment status counts
    let apartments = [];
    try {
      apartments = await fetchWithAuth(`${API_BASE_URL}/apartments/`);
    } catch (error) {
      console.error('Xonalar ro\'yxatini olishda xatolik:', error);
      throw error;
    }
    
    const statusCounts = {
      bosh: 0,
      band: 0,
      sotilgan: 0,
      muddatli: 0
    };

    // Handle both array and paginated responses
    const apartmentsList = Array.isArray(apartments) ? apartments : (apartments?.results || []);
    
    apartmentsList.forEach(apt => {
      if (apt?.status && statusCounts.hasOwnProperty(apt.status)) {
        statusCounts[apt.status]++;
      }
    });

    // 2. Get today's payments
    const today = getCurrentDate();
    let payments = [];
    try {
      const paymentsData = await fetchWithAuth(`${API_BASE_URL}/payments/`);
      // Handle both array and paginated responses
      const allPayments = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.results || []);
      
      // Filter payments for today
      payments = allPayments.filter(p => {
        const paymentDate = p?.created_at || p?.date_created || '';
        return paymentDate.startsWith(today);
      });
    } catch (error) {
      console.error('To\'lovlarni olishda xatolik:', error);
      // Continue with empty payments if there's an error
    }

    // 3. Get expense statistics (handle if endpoint doesn't exist)
    let expenseStats = {};
    try {
      expenseStats = await fetchWithAuth(`${API_BASE_URL}/expenses/statistics/`) || {};
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Xarajatlar statistikasini olishda xatolik:', error.message);
      }
      // Continue with empty stats if endpoint doesn't exist
    }

    // 4. Get total debt from users
    let totalDebt = 0;
    try {
      const users = await fetchWithAuth(`${API_BASE_URL}/users/?user_type=mijoz`);
      if (users && Array.isArray(users.results)) {
        totalDebt = users.results.reduce((sum, user) => sum + (Number(user.balance) || 0), 0);
      }
    } catch (error) {
      console.error('Foydalanuvchilarni olishda xatolik:', error.message);
      // Continue with 0 debt if there's an error
    }

    // Calculate payment statistics
    const paymentStats = {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    };

    // Format the message
    const currentDate = format(new Date(), 'dd.MM.yyyy HH:mm');
    
    const message = `
📊 <b>Kunlik hisobot (${currentDate})</b>

🏢 <b>Xonadonlar holati:</b>
• Bo'sh: ${statusCounts.bosh} ta
• Band: ${statusCounts.band} ta
• Sotilgan: ${statusCounts.sotilgan} ta
• Muddatli to'lov: ${statusCounts.muddatli} ta

💵 <b>Bugungi to'lovlar:</b>
${paymentStats.total > 0 ? `• Soni: ${paymentStats.total} ta
• Jami: ${paymentStats.totalAmount.toLocaleString()} so'm` : '• Bugun to\'lovlar mavjud emas'}

💰 <b>Umumiy qarzdorlik:</b>
• ${totalDebt.toLocaleString()} so'm

💸 <b>Xarajatlar:</b>
• Umumiy xarajatlar: ${(expenseStats.total_amount || 0).toLocaleString('uz-UZ')} $
• To'langan: ${(expenseStats.paid_amount || 0).toLocaleString('uz-UZ')} $
• Qarz: ${(expenseStats.pending_amount || 0).toLocaleString('uz-UZ')} $
🏦 <b>Umumiy qarzdorlik:</b> ${totalDebt.toLocaleString('uz-UZ')} $
`;

    // Log the message to console
    console.log('\n=== DAILY REPORT ===');
    console.log(message.replace(/<[^>]*>/g, '')); // Remove HTML tags for cleaner console output
    console.log('===================');
    
    // Send the message to Telegram
    await sendTelegramMessage(message);
    console.log('Daily report sent to Telegram successfully');
  } catch (error) {
    console.error('Error generating daily report:', error);
  }
}

// Schedule the task to run every day at 12:00 PM
console.log('Scheduling daily report at 12:00 PM...');
cron.schedule('0 12 * * *', async () => {
  try {
    await generateDailyReport();
    console.log(`Keyingi hisobot Toshkent vaqti bilan soat 12:00 da yuboriladi.`);
  } catch (error) {
    console.error('Hisobot yuborishda xatolik:', error);
  }
}, {
  timezone: 'Asia/Tashkent'
});

// Initial report
(async () => {
  console.log('Dastlabki hisobot tayyorlanmoqda...');
  try {
    await generateDailyReport();
  } catch (error) {
    console.error('Dastlabki hisobotda xatolik:', error);
  }
  console.log('Dastlabki hisobot yuborildi. Keyingi hisobot Toshkent vaqti bilan soat 12:00 da yuboriladi.');
})();

console.log('Daily report scheduler is running. Press Ctrl+C to exit.');
