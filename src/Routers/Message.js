const express = require('express')
const router = new express.Router()
const Schema = require('../Model/Schema')

const socketIO = require('socket.io');
const server = require('http').createServer(router);
const io = socketIO(server);

io.on('connection', (socket) => {
    console.log('User connected', socket.id);
  
    // Listen for messages
    socket.on('message', async (data) => {
      const { user, text } = data;
  
      // Save the message to the MongoDB database
      const message = new Schema.MessageModelSchema({ user, text });
      await message.save();
  
      // Broadcast the message to all connected clients
      io.emit('message', data);
    });
  
    // Listen for disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected', socket.id);
    });
  });

  router.get('/api/get-all-messages', async (req, res) => {
    try {
      const messages = await Schema.MessageModelSchema.find().exec();
      res.status(200).json({ success: true, messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });
router.post('/api/send-message', (req, res) => {
    const { user, text } = req.body;
  
    // Save the message to the MongoDB database
    const message = new Schema.MessageModelSchema({ user, text });
    message.save()
      .then(() => {
        // Broadcast the message to all connected clients
        io.emit('message', { user, text });
  
        // Send a response to the client
        res.status(200).json({ success: true, message: 'Message sent successfully.' });
      })
      .catch((error) => {
        console.error('Error saving message:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      });
  });
  
module.exports = router;