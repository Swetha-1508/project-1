"use strict";

// Import dependencies and set up the HTTP server
const express = require("express"),
  { urlencoded, json } = require("body-parser"),
  crypto = require("crypto"),
  path = require("path"),
  Receive = require("./services/receive"),
  GraphApi = require("./services/graph-api"),
  User = require("./services/user"),
  config = require("./config"),
  app = express();

config.checkEnvVariables();

var users = {};

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));

// Parse application/json. Verify that callback came from Instagram
app.use(json({ verify: verifyRequestSignature }));

// Serving static files in Express
app.use(express.static(path.join(path.resolve(), "public")));

// Respond with index file when a GET request is made to the homepage
app.get("/", function (_req, res) {
  res.sendFile(path.join(path.resolve(), "public", "index.html"));
});

// Add support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === config.verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Create the endpoint for your webhook
app.post("/webhook", async (req, res) => {
  let body = req.body;

  console.log(`\u{1F7EA} Received webhook:`);
  console.dir(body, { depth: null });

  if (body.object === "instagram") {
    res.status(200).send("EVENT_RECEIVED");

    for (const entry of body.entry) {
      try {
        if ("changes" in entry) {
          let receiveMessage = new Receive();
          for (const change of entry.changes) {
            switch (change.field) {
              case "feed":
                if (change.value.item === "post") {
                  await receiveMessage.handlePrivateReply(
                    "post_id",
                    change.value.post_id
                  );
                } else if (change.value.item === "comment") {
                  await receiveMessage.handlePrivateReply(
                    "comment_id",
                    change.value.comment_id
                  );
                }
                break;
              default:
                console.warn("Unsupported Instagram change type.");
            }
          }
        } else {
          for (const webhookEvent of entry.messaging) {
            if ("read" in webhookEvent) {
              console.log("Got a read event");
              continue;
            }
            if ("delivery" in webhookEvent) {
              console.log("Got a delivery event");
              continue;
            }
            if (webhookEvent.message && webhookEvent.message.is_echo) {
              console.log(
                "Got an echo of our send, mid = " + webhookEvent.message.mid
              );
              continue;
            }

            let senderPsid = webhookEvent.sender.id;
            let guestUser = isGuestUser(webhookEvent);

            if (senderPsid) {
              if (!(senderPsid in users)) {
                if (!guestUser) {
                  let user = new User(senderPsid);
                  let userProfile = await GraphApi.getUserProfile(senderPsid);
                  user.setProfile(userProfile);
                  console.log("locale: " + user.locale);
                  users[senderPsid] = user;
                  console.log(
                    "New Profile PSID:",
                    senderPsid,
                    "with locale:",
                    user.locale
                  );
                  receiveAndReturn(users[senderPsid], webhookEvent, false);
                } else {
                  setDefaultUser(senderPsid);
                  receiveAndReturn(users[senderPsid], webhookEvent, false);
                }
              } else {
                console.log(
                  "Profile already exists PSID:",
                  senderPsid,
                  "with locale:",
                  users[senderPsid].locale
                );
                receiveAndReturn(users[senderPsid], webhookEvent, false);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing webhook event:", error);
      }
    }
  } else {
    res.sendStatus(404);
  }
});

function setDefaultUser(id) {
  let user = new User(id);
  users[id] = user;
}

function isGuestUser(webhookEvent) {
  let guestUser = false;
  if ("postback" in webhookEvent) {
    if ("referral" in webhookEvent.postback) {
      if ("is_guest_user" in webhookEvent.postback.referral) {
        guestUser = true;
      }
    }
  }
  return guestUser;
}

function receiveAndReturn(user, webhookEvent, isUserRef) {
  let receiveMessage = new Receive(user, webhookEvent, isUserRef);
  return receiveMessage.handleMessage();
}

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    console.warn(`Couldn't find "x-hub-signature" in headers.`);
  } else {
    var elements = signature.split("=");
    var signatureHash = elements[1];
    var expectedHash = crypto
      .createHmac("sha1", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

var listener = app.listen(config.port, function () {
  console.log(`The app is listening on port ${listener.address().port}`);
  if (config.appUrl && config.verifyToken) {
    console.log(
      "Webhook setup: Make sure your Instagram account is configured to send webhooks to this URL:\n" +
      `${config.appUrl}/webhook`
    );
  }

  if (config.pageId) {
    console.log(`Page ID: ${config.pageId}`);
  }
});

