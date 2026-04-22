/**
 * Attatched metadata to objects in S3 bucket via env var
 * Most of this was created by Grok idk what's happening
 */
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getAllObjectKeys } from "../utils/bucketHelper";
import readConfig from "../utils/config";
import { imgConfig } from "../../../assets/metadata/images";

const config = readConfig();
const s3 = new S3Client({ region: process.env.REGION });

export const handler = async () => {
  const bucket = config.S3_BUCKET_NAME;
  if (!bucket) {
      return {error: "No bucket env"}
    }
  const objects = await getAllObjectKeys(s3, bucket);

  // In the future, you can loop over 'objects' here to attach metadata
  // e.g., for each key, use CopyObjectCommand with MetadataDirective: 'REPLACE'

  // Parse the IMAGE_CONFIG env var
  const configs = imgConfig;

  if (!configs) {
    console.log("CONFIGS IS EMPTY");
  }
  const updated: (string | undefined)[] = [];

  for (const key of objects) {
    // Find matching config by imgName
    const config = configs.find((c: any) => c.imgName === key);
    if (!config) {
      console.log(`No config found for ${key}, skipping.`); // TODO use actual logger instead
      continue;
    }

    // Get existing object details (for ContentType, etc.)
    const headCmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const head = await s3.send(headCmd);

    // Prepare new metadata (edit this to capture wanted headers from images.ts)
    const newMetadata = {
      imgName: config.imgName,
      Location: config.Location,
      Latitude: config.Latitude,
      Longitude: config.Longitude,
      Categories: config.Categories
    };

    // Copy object to itself with updated metadata
    const copyCmd = new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: `${bucket}/${key}`,
      Metadata: newMetadata, // Overwrites existing metadata; merge with head.Metadata if needed
      MetadataDirective: "REPLACE",
      ContentType: head.ContentType, // Preserve original
    });

    await s3.send(copyCmd);
    console.log(`Metadata attached to ${key}`);
    updated.push(key);
  }

  return { updated };
};
