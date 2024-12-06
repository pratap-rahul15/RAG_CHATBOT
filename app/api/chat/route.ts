import OpenAI from "openai";
import { DataAPIClient } from "@datastax/astra-db-ts"


// Environment Variabl. 
const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {

  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    // Start generating Embeddings for the user's latest message .
    
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    try {

      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 10,
      });

      const document = await cursor.toArray();
      const docsMap = document?.map((doc) => doc.text);

      docContext = JSON.stringify(docsMap);
    } catch (err) {
      console.log("Error querying the db...");
      docContext = "";
    }

    const template = {

      role: "system",
      content: ` You are an AI assistant who knows everything about Formula One.
            Use the below context to augment what you know about Formula One racing.
            The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
            If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or
            what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            -------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            -------------
            QUESTION: ${latestMessage}
            -------------
            `,
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      stream: true,
      messages: [template, ...messages],
    });

    // Convert response stream to ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const text = chunk.choices?.[0]?.delta?.content || "";
          controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    // Return the stream as a Response
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err) {
    throw err;
  }
}
