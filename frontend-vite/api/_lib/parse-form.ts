import type { VercelRequest } from '@vercel/node';
import formidable from 'formidable';
import type { File } from 'formidable';

// This helper parses the file and fields from your <form>
export const parseForm = (
  req: VercelRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};