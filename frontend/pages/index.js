import Head from "next/head";
import ChatLayout from "../components/ChatLayout";

export default function Home() {
  return (
    <>
      <Head>
        <title>Steel - Real-time Developer Chat</title>
        <meta
          name="description"
          content="Real-time chat for developers. Share code, collaborate, and build together."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <ChatLayout />
      </main>
    </>
  );
}
