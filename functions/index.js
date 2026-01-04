const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const Iyzipay = require("iyzipay");

admin.initializeApp();

// --- v2 AutoFlow Triggers ---

/**
 * Trigger: When a program is assigned to a member
 * Action: Execute Trainer's AutoFlow Rules
 */
exports.onProgramAssigned = onDocumentCreated("assigned_programs/{assignmentId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const { memberId, trainerId, title } = data;

  // 1. Fetch Trainer's AutoFlow Rules
  const rulesSnapshot = await admin.firestore().collection("autoflows")
    .where("trainerId", "==", trainerId)
    .where("isActive", "==", true)
    .where("triggerType", "==", "program_assigned")
    .get();

  if (rulesSnapshot.empty) return;

  // 2. Fetch Member Profile for template replacement
  const memberDoc = await admin.firestore().collection("users").doc(memberId).get();
  const memberName = memberDoc.data()?.name || "Öğrenci";

  const batch = admin.firestore().batch();

  // 3. Execute Actions
  rulesSnapshot.forEach(doc => {
    const rule = doc.data();
    
    // Replace variables
    const message = rule.messageTemplate.replace("{name}", memberName).replace("{program}", title);

    if (rule.actionType === "send_notification") {
      const ref = admin.firestore().collection("notifications").doc();
      batch.set(ref, {
        recipientId: memberId,
        message: message,
        type: "info",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    } 
    else if (rule.actionType === "send_message") {
      // Create a chat message
      const chatId = [trainerId, memberId].sort().join("_");
      const ref = admin.firestore().collection("chats").doc(chatId).collection("messages").doc();
      batch.set(ref, {
        senderId: trainerId,
        text: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    }
  });

  await batch.commit();
  logger.info(`AutoFlow executed for trainer ${trainerId} on member ${memberId}`);
});

// --- v2 Video Service ---

/**
 * Callable: Get Cloudflare Stream Direct Upload URL
 * (Currently Mocked)
 */
exports.getCloudflareUploadUrl = onCall((request) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
  }

  // In a real implementation, you would call Cloudflare API here
  // const accountId = "your-account-id";
  // const apiToken = "your-api-token";
  
  // Mock Response
  return {
    uploadUrl: "https://upload.videodelivery.net/mock-upload-url-from-cloud-function",
    videoId: "mock-video-id-" + Date.now()
  };
});

// --- Legacy / v1 Functions ---

// Initialize Iyzico with Sandbox Credentials
const iyzipay = new Iyzipay({
  apiKey: "sandbox-api-key-placeholder", // Replace with actual sandbox key
  secretKey: "sandbox-secret-key-placeholder", // Replace with actual sandbox secret
  uri: "https://sandbox-api.iyzipay.com"
});

// Basic Hello World Function
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("FitPortal Backend API is Active!");
});

// Create Subscription (Payment)
exports.createSubscription = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    
    try {
      const { price, planName, userEmail, cardHolderName, cardNumber, expireMonth, expireYear, cvc, identityNumber } = req.body;
      
      // In production, do NOT handle raw card data on backend if possible.
      // Use Iyzico Checkout Form for PCI Compliance. 
      // For this MVP/Prototype, we simulate direct payment request.

      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: '123456789',
        price: price,
        paidPrice: price,
        currency: Iyzipay.CURRENCY.TRY,
        installment: '1',
        basketId: 'B67832',
        paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        paymentCard: {
          cardHolderName: cardHolderName,
          cardNumber: cardNumber,
          expireMonth: expireMonth,
          expireYear: expireYear,
          cvc: cvc,
          registerCard: '0'
        },
        buyer: {
          id: 'BY789',
          name: 'John',
          surname: 'Doe',
          gsmNumber: '+905350000000',
          email: userEmail,
          identityNumber: identityNumber || '74300864791',
          lastLoginDate: '2015-10-05 12:43:35',
          registrationDate: '2013-04-21 15:12:09',
          registrationAddress: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
          ip: '85.34.78.112',
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34732'
        },
        shippingAddress: {
          contactName: 'Jane Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
          zipCode: '34742'
        },
        billingAddress: {
          contactName: 'Jane Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
          zipCode: '34742'
        },
        basketItems: [
          {
            id: 'BI101',
            name: planName,
            category1: 'SaaS',
            category2: 'Subscription',
            itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
            price: price
          }
        ]
      };

      iyzipay.payment.create(request, function (err, result) {
        if (err) {
           logger.error("Iyzico Error", err);
           return res.status(500).json({ error: err });
        }
        
        if (result.status === 'success') {
             res.status(200).json({ 
                status: 'success', 
                message: `Subscription to ${planName} started.`,
                paymentResult: result
            });
        } else {
            res.status(400).json({ error: result.errorMessage, errorCode: result.errorCode });
        }
      });

    } catch (error) {
      logger.error("System Error", error);
      res.status(500).json({ error: error.message });
    }
  });
});
