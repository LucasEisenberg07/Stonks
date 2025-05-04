import express from 'express';
import fs from 'fs';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const app = express()
const port = 1000
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1-nano";

const client = ModelClient(
    endpoint,
    new AzureKeyCredential(token),
);

app.use(express.json());

import yahooFinance from 'yahoo-finance2';

const results = await yahooFinance.search('MSFT');
const quote = await yahooFinance.quote('MSFT');

app.get('/', async (_, res) => {
    console.log(JSON.stringify(quote, null, 2));
    const result = await fs.promises.readFile('index.html', 'utf8');
    res.send(result);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

app.post('/search', async (req, res) => {
    try {
        const { stonk, days } = req.body;
        if (!stonk) {
            return res.status(400).json({ error: 'Stonk symbol is required' });
        }

        const quote = await yahooFinance.quote(stonk);

        const chart = await yahooFinance.chart(stonk, { period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0], period2: new Date().toISOString().split('T')[0], interval: '1d' });
        console.log(JSON.stringify(chart, null, 2));
        res.json(
            chart.quotes.map(quote => ({
                date: quote.date,
                open: quote.open
            }))
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

app.post('/chat-bot', async (req, res) => {
    try {
        const client = ModelClient(
            endpoint,
            new AzureKeyCredential(token),
          );
        
          const response = await client.path("/chat/completions").post({
            body: {
              messages: [
                { role:"system", content: "" },
                { role:"user", content: `${req.body.message}.` }
              ],
              temperature: 1,
              top_p: 1,
              model: model
            }
          });
        
          if (isUnexpected(response)) {
            throw response.body.error;
          }
        
          console.log(response.body.choices[0].message.content);
        res.json({ reply: response.body.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to communicate with chatbot' });
    }
});

