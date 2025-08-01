import Head from "next/head";
import ChatLayout from "../components/ChatLayout";

export default function Home() {
  return (
    <>
      <Head>
        <title>Steel - Private Messaging</title>
        <meta
          name="description"
          content="Private messaging for developers. Chat securely with your team members."
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
