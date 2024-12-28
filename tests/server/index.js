import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import parser from '../../src/services/parser/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/', express.static(join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Parse text endpoint
app.post('/parse', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'No text provided'
            });
        }

        if (typeof text !== 'string' || text.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input: text must be a string under 1000 characters'
            });
        }

        const result = await parser.parse(text);
        
        // Clean up large objects after use
        if (result.result?.metadata?.tokens) {
            delete result.result.metadata.tokens;
        }

        res.json(result);
    } catch (error) {
        console.error('Parser error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export function startServer(port = 3000) {
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`Test server running on http://localhost:${port}`);
            resolve(server);
        });
    });
}

// Only start server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startServer(process.env.PORT || 3000);
}
