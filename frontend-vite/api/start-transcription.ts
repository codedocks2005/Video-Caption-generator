import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { parseForm } from './_lib/parse-form';
import fs from 'fs';

// Initialize Replicate with your API token (from Vercel env)

// We disable Vercel's default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      
    // 1. Parse the form data (file, task, language)
    const { fields, files } = await parseForm(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }

    // 2. Convert file to a base64 data URI
    const fileBuffer = await fs.promises.readFile(file.filepath);
    const dataUri = `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`;

    // 3. Set up the input for the Replicate API
    const model = "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e";
    const input: any = {
      audio: dataUri,
      language: fields.language as string,
      transcription: "verbose_json", // This gives us segments and timestamps!
    };

    if (fields.task === 'translate') {
      input.translate = true;
    }
    if (fields.task === 'transliterate') {
      input.language = 'hi'; // Force Hindi for transliteration
      input.initial_prompt = "सारे स्कूल के बच्चों, ध्यान से सुनना। 2004 में इंडियन ओशन में एक भयंकर सुनामी आई थी।";
    }

    // 4. Start the prediction job on Replicate
    console.log("Starting prediction on Replicate...");
    const prediction = await replicate.predictions.create({
      model: model,
      input: input,
    });

    console.log("Prediction started:", prediction.id);

    // 5. Send the new prediction object (which contains the ID)
    res.status(202).json(prediction); // 202 means "Accepted" (job started)

  } catch (error: any) {
    console.error("Error starting prediction:", error);
    res.status(500).json({ detail: error.message || 'Error starting transcription.' });
  }
}