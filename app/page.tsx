"use client"
import Image from "next/image"
import f1 from "./assets/f1.png"
import { useChat } from "ai/react"
import { Message } from "ai"
import Bubble from "./components/Bubble"
import PromptSuggestionsRow from "./components/PromptSuggestionsRow"
import LoadingBubble from "./components/LoadingBubble"




const Home = () => {

    const { append, isLoading, messages, input, handleInputChange, handleSubmit } = useChat()

    const noMessages = !messages || messages.length === 0

    const handlePrompt = ( promptText ) => {

        const msg: Message = {

            id: crypto.randomUUID(),
            content: promptText,
            role: "user"

        }

        append(msg)
    }

  

    return (
        <main>
            <Image src={f1} width="250" alt="f1" />

            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                    <p className="starter-text">
                        The exclusive place for Formula One awesome fans!
                        Ask F1GPT anything about the fantastic topic of F1 racing 
                        & it will come back with the most up-to-date answers.
                        I hope you'll love it!
                    </p>
                    <br />
                    <PromptSuggestionsRow onPromptClick={handlePrompt} />
                    </>

                ): (
                    <>
                    {messages.map((message, index) => <Bubble key={`message-${index}`} message={message} /> )}
                    {isLoading && <LoadingBubble />}
                    </>

                )}
            </section>
            <form onSubmit={handleSubmit}>
                    <input className="question-box" onChange={handleInputChange} value={input} placeholder="Start asking!" />
                    <input type="submit" />
            </form>
        </main>
    )

}

export default Home