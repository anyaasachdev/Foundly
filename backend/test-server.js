const express = require('express');
const app = express();

app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Working endpoint
app.get('/working', (req, res) => {
  const { action } = req.query;
  if (action === 'test') {
    res.json({ success: true, message: 'Working endpoint is functional' });
  } else {
    res.json({ error: 'Invalid action' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 