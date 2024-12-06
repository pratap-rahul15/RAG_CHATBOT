// This file is responsible for loading all the data into the Datastax DB.

import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"
import OpenAI from "openai"

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

import "dotenv/config"
import { constants } from "buffer"


// To find similarity between two embeddings/vectors.

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const { 
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    OPENAI_API_KEY 
} = process.env

// Connect to openAI API

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// All the websites from which my data will be scraped.

const f1Data = [
     'https://en.wikipedia.org/wiki/Formula_One',
     'https://www.formula1.com/'
]

// Now scrape it, connect to the DB to store the chunks in it.

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)

const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

const splitter =  new RecursiveCharacterTextSplitter ({

    chunkSize: 512,
    chunkOverlap: 100

})

// Now create a collection into the DB.
const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try {
        // Check if the collection already exists
        const existingCollections = await db.listCollections();
        
        // Extract the collection names
        const collectionNames = existingCollections.map((collection: { name: string }) => collection.name);
        
        if (collectionNames.includes(ASTRA_DB_COLLECTION)) {
            console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists.`);
            return;
        }

        // If not, create the collection
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536,
                metric: similarityMetric
            }
        });

        console.log(`Collection '${ASTRA_DB_COLLECTION}' created successfully:`, res);
    } catch (error) {
        console.error("Error while creating the collection:", error);
    }
};


// Now create a function which will use all the URL above, chunk them up, creata vector embeddings out of those chunks & store in the vector DB. 

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)
    for await(const url of f1Data) {

        const content =  await scrapePage(url)
        const chunks =  await splitter.splitText(content)
        for await (const chunk of chunks) {
            const embedding = await openai.embeddings.create({

                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float"
            })

            // Response

            const vector = embedding.data[0].embedding

            const res = await collection.insertOne({

                $vector: vector,
                text: chunk
            })
            console.log(res);
        }
    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
         const result =   await page.evaluate(() => document.body.innerHTML)
         await browser.close()
         return result;
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm,'')

}

createCollection().then(() => loadSampleData())