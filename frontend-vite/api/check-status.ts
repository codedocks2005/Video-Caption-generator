import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';

// Try to import transliteration libraries, fallback to no-op if fails
let transliterate: any = (text: string) => text;
let sanscript: any = {};

try {
  // Dynamically require to avoid static import errors
  const indic = require('indic-transliteration');
  transliterate = indic.transliterate;
  sanscript = indic.sanscript;
} catch (err) {
  console.warn('indic-transliteration not available, transliteration will be skipped.');
}

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const { id, task } = req.query; // Get Job ID and Task from URL

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ detail: 'Missing prediction ID.' });
    }

    // 1. Get the latest status from Replicate
    const prediction = await replicate.predictions.get(id);

    // 2. If the job succeeded, we do our "secret sauce" transliteration
    if (prediction.status === 'succeeded' && task === 'transliterate') {
      console.log('Transliterating final output...');
      
      const originalSegments = prediction.output.segments;
      const finalSegments = originalSegments.map((seg: any) => ({
        ...seg,
        text: transliterate(seg.text, sanscript.DEVANAGARI, sanscript.ITRANS),
      }));

      // Replace the output with our new, transliterated segments
      prediction.output.segments = finalSegments;
    }

    // 3. Send the full prediction object back to the React app
    res.status(200).json(prediction);

  } catch (error: any) {
    console.error("Error checking status:", error);
    res.status(500).json({ detail: error.message || 'Error checking status.' });
  }
}