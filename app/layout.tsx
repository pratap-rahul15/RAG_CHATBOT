import { title } from "process"
import "./global.css"

export const metadata = {

    title:"F1GPT",
    description: "The place to go for all your Formula 1 questions!"


}

const RootLayout = ({ children }) => {

    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}

export default RootLayout