const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const axios = require('axios');
require('dotenv').config();

const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const gemini = new GoogleGenAI({
 apiKey: process.env.GEMINI_API_KEY
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const client = new Client({
  puppeteer: {
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    timeout: 60000 // 60 detik
  },
  authStrategy: new LocalAuth()
});

const allowedGroupIds = [
  '123456789-123456789@g.us',  // Ganti dengan ID grup yang diizinkan
  '987654321-987654321@g.us'
];

async function queryGemini(prompt) {
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Gemini API gagal');
  }
}

async function queryDeepSeek(prompt) {
  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw new Error('DeepSeek API gagal');
  }
}

async function queryChatGPT(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // atau 'gpt-4'
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('ChatGPT API error:', error);
    throw new Error('ChatGPT API gagal');
  }
}

client.on('message', async msg => {
  // allow only group messages
  //const chatId = msg.from;
  //const isGroup = chatId.endsWith('@g.us');
  //
  //if (!isGroup) {
  //  return;
  //}
  //
  //if (!allowedGroupIds.includes(chatId)) {
  //  return;
  //}

  const body = msg.body.trim();
  
  try {
    if (body.toLowerCase().startsWith('gemini:')) {
      const prompt = body.slice('gemini:'.length).trim();
      if (!prompt) return msg.reply('Tolong tulis pertanyaan setelah prefix "gemini:"');
      const reply = await queryGemini(prompt);
      msg.reply(reply);
    }
    else if (body.toLowerCase().startsWith('deepseek:')) {
      const prompt = body.slice('deepseek:'.length).trim();
      if (!prompt) return msg.reply('Tolong tulis pertanyaan setelah prefix "deepseek:"');
      const reply = await queryDeepSeek(prompt);
      msg.reply(reply);
    }
    else if (body.toLowerCase().startsWith('chatgpt:')) {
      const prompt = body.slice('chatgpt:'.length).trim();
      if (!prompt) return msg.reply('Tolong tulis pertanyaan setelah prefix "chatgpt:"');
      const reply = await queryChatGPT(prompt);
      msg.reply(reply);
    }
  } catch (error) {
    console.error('Error saat memproses pesan:', error);
    msg.reply('Maaf, terjadi kesalahan saat memproses permintaan Anda.');
  }
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', async message => {
    const contact = await message.getContact();
    const name = contact.pushname;
    const senderId = message.from;
    const receiver = message.to;

	console.log(name, '(', senderId, ')', ' => ', receiver,' : ', message.body);
});

client.on('message_create', message => {
	if (message.body === '!ping') {
		// reply back "pong" directly to the message
		message.reply('pong');
    client.sendMessage(message.from, 'pongggg');
	}
});

client.initialize();

