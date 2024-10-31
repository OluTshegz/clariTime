// reminder-service.js
// This Node.js service runs periodically to check and process due reminders for users

import { callReadOnlyFunction, makeContractCall, broadcastTransaction, standardPrincipalCV, uintCV } from "@stacks/transactions";
import axios from "axios"; // For sending notifications
import { StacksTestnet } from "@stacks/network";

const network = new StacksTestnet();
const contractAddress = "SPXXXXXXXXXXXXXXXXX.notifications"; // Replace with actual contract address
const senderKey = "YOUR_PRIVATE_KEY"; // Replace with the private key to send transactions
const notificationApiUrl = "https://api.example.com/send-notification"; // Replace with actual notification API endpoint

// Poll interval in milliseconds (e.g., 10 minutes)
const POLL_INTERVAL = 10 * 60 * 1000;

// Function to dynamically fetch user addresses from a data source
async function fetchUserAddresses() {
  // This can be a database query or an API call. Here’s a placeholder implementation.
  return ["SPXXXXXXXXXXXXXXXXX", "SPYYYYYYYYYYYYYYYYY"]; // Replace with actual fetching logic
}

// Fetch upcoming reminders for a user
const fetchUpcomingReminders = async (userAddress) => {
  try {
    const response = await callReadOnlyFunction({
      contractAddress,
      contractName: "notifications",
      functionName: "get-upcoming-reminders",
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });
    return response.result; // Processed list of reminders
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return [];
  }
};

// Send notification to user
const sendNotification = async (user, message) => {
  try {
    await axios.post(notificationApiUrl, { user, message });
    console.log(`Notification sent to ${user}: ${message}`);
  } catch (error) {
    console.error(`Failed to send notification to ${user}:`, error);
  }
};

// Mark reminder as notified in the contract
const markReminderAsNotified = async (user, reminderId) => {
  const tx = await makeContractCall({
    contractAddress,
    contractName: "notifications",
    functionName: "mark-as-notified",
    functionArgs: [standardPrincipalCV(user), uintCV(reminderId)],
    senderKey,
    network,
  });
  const txId = await broadcastTransaction(tx, network);
  console.log(`Marked reminder ${reminderId} as notified for ${user}: ${txId}`);
};

// Process due reminders for all users
const processDueReminders = async () => {
  const users = await fetchUserAddresses(); // Fetch the dynamic user addresses

  for (const user of users) {
    const reminders = await fetchUpcomingReminders(user);
    for (const reminder of reminders) {
      await sendNotification(user, reminder.message);
      await markReminderAsNotified(user, reminder.reminder-id);
    }
  }
};

// Run the service at regular intervals
setInterval(processDueReminders, POLL_INTERVAL);
console.log(`Reminder service started, polling every ${POLL_INTERVAL / 1000 / 60} minutes.`);
