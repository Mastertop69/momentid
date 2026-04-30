import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
  DeleteFacesCommand,
} from '@aws-sdk/client-rekognition'

export const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export function getCollectionId(eventSlug: string): string {
  return `momentid-${eventSlug}`
}

export async function createCollection(eventSlug: string): Promise<void> {
  const collectionId = getCollectionId(eventSlug)
  try {
    await rekognitionClient.send(
      new CreateCollectionCommand({ CollectionId: collectionId })
    )
  } catch (error: any) {
    if (error.name === 'ResourceAlreadyExistsException') {
      console.log(`Colección ya existe: ${collectionId}`)
    } else {
      throw error
    }
  }
}

export async function indexFace(
  eventSlug: string,
  photoId: string,
  imageBytes: Uint8Array
): Promise<string[]> {
  const collectionId = getCollectionId(eventSlug)
  const response = await rekognitionClient.send(
    new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: photoId,
      DetectionAttributes: [],
      MaxFaces: 10,
    })
  )
  return response.FaceRecords?.map((r) => r.Face?.FaceId || '').filter(Boolean) || []
}

export async function searchFacesByImage(
  eventSlug: string,
  selfieBytes: Uint8Array,
  threshold: number = 90
): Promise<{ photoId: string; similarity: number; faceId: string }[]> {
  const collectionId = getCollectionId(eventSlug)
  try {
    const response = await rekognitionClient.send(
      new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: selfieBytes },
        MaxFaces: 100,
        FaceMatchThreshold: threshold,
      })
    )
    return response.FaceMatches?.map((match) => ({
      photoId: match.Face?.ExternalImageId || '',
      similarity: match.Similarity || 0,
      faceId: match.Face?.FaceId || '',
    })) || []
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') return []
    throw error
  }
}