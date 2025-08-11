import { startDailyReportScheduler, createReportMessage } from './app/lib/telegram/index.js';

// Server ishga tushgandan keyin Telegram xabarlarini yuborishni ishga tushirish
startDailyReportScheduler();

// Server ishga tushgandan keyin test uchun xabar yuborish
console.log('\n=== SERVER STARTED ===');
console.log('Telegram xabarlarini yuborish ishga tushdi');
console.log('Konsolga chiqariladigan xabarlar:');

// Har kuni 12:00 soatda ma'lumotlarni olib xabar yuborish
const scheduleDailyReport = () => {
  const now = new Date();
  const nextReportTime = new Date(now);
  
  // Agar hozirgi vaqt 12:00 dan keyin bo'lsa, keyingi kuni 12:00 soatda ishga tushirish
  if (now.getHours() >= 12) {
    nextReportTime.setDate(nextReportTime.getDate() + 1);
  }
  
  nextReportTime.setHours(12, 0, 0, 0);
  
  const millisecondsUntilNextReport = nextReportTime.getTime() - now.getTime();
  
  // 12:00 soatda ma'lumotlarni olib xabar yuborish
  setTimeout(async () => {
    try {
      // API ma'lumotlarini olish
      const [debtors, apartments, payments, expenses] = await Promise.all([
        fetch('http://api.ahlan.uz/api/debtors/total'),
        fetch('http://api.ahlan.uz/api/apartments/status'),
        fetch('http://api.ahlan.uz/api/payments/summary'),
        fetch('http://api.ahlan.uz/api/expenses/summary')
      ]);

      // API ma'lumotlarini konsolga chiqarish
      console.log('\n=== DAILY REPORT ===');
      console.log('=== API DATA ===');
      console.log('Debtors:', await debtors.json());
      console.log('Apartments:', await apartments.json());
      console.log('Payments:', await payments.json());
      console.log('Expenses:', await expenses.json());
      
      // Ma'lumotlardan xabar yaratish
      const reportData = {
        debtors: await debtors.json(),
        apartments: await apartments.json(),
        payments: await payments.json(),
        expenses: await expenses.json()
      };
      
      const reportMessage = createReportMessage(reportData);
      
      // Xabarni konsolga chiqarish
      console.log('\n=== FINAL DAILY REPORT ===');
      console.log(reportMessage);
      console.log('=======================\n');
      
      // Keyingi kuni 12:00 soatda qayta ishga tushirish
      scheduleDailyReport();
      
    } catch (error) {
      console.error('Xatolik yuz berdi:', error);
      // Agar xatolik yuz bersa, keyingi kuni 12:00 soatda qayta ishga tushirish
      scheduleDailyReport();
    }
  }, millisecondsUntilNextReport);
};

// Server ishga tushgandan keyin 12:00 soatda ishga tushirish
scheduleDailyReport();

// Server ishga tushgandan keyin qo'shimcha xabarlar
console.log('\n=== SERVER CONFIGURATION ===');
console.log('Telegram Bot Token:', TELEGRAM_BOT_TOKEN);
console.log('Telegram Chat IDs:', TELEGRAM_CHAT_IDS);
console.log('Report will be sent to:', TELEGRAM_CHAT_IDS.join(', '));
console.log('==========================\n');
