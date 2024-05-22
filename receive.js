"use strict";

class Receive {
  constructor() {}

  handleComment(commentId, text) {
    console.log(`Handling comment ${commentId}: ${text}`);
    // Implement your logic to handle the comment
  }

  handleMedia(mediaId) {
    console.log(`Handling media ${mediaId}`);
    // Implement your logic to handle the media
  }
}

module.exports = Receive;
