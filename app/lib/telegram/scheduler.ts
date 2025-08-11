import { generateDailyReport } from './dailyReport';
export const startDailyReportScheduler = () => {
  // Create function to send report
  const sendReport = async () => {
    console.log('Starting daily report generation...');
    await generateDailyReport();
    console.log('Daily report sent successfully');
  };

  // Send report immediately when app starts
  sendReport();

  // Schedule the report to run every 3 minutes for testing using setInterval
  setInterval(sendReport, 3 * 60 * 1000); // 3 minutes in milliseconds

  console.log('Daily report scheduler started. Reports will be sent every 3 minutes');
};

// Log when the next execution will be
console.log('Daily report scheduler started.');
