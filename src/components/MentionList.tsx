"use client";

import React, { useState, useEffect } from "react";
import AppImages from "./AppImages.tsx";
import { useWebSocket } from "../context/WebSocketContext.tsx";

interface Mention {
  user_name: string;
  user_handle: string;
  profile_tagline: string;
  profile_image: string;
}

interface MentionApiResponse {
  data: Mention[];
  status: number;
  request_type: string;
}

interface MentionTypeaheadOption {
  id: string;
  // Add other properties that the mention option might have, like a username, image, etc.
}

interface MentionListProps {
  options: MentionTypeaheadOption[]; // List of mention options
  userHandle: string; // The current query string (for filtering, if needed)
  onClick: (option: MentionTypeaheadOption) => void; // Click handler function to handle the mention selection
}

const MentionList: React.FC<MentionListProps> = ({ userHandle, onClick }) => {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { webSocket, appToken } = useWebSocket();

  const token =
    appToken ??
    "eeyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDcwNDg2NDMsImV4cCI6MTc1NDgyNDY0MywiZGF0YSI6WyJlYzcxMzIyYjkxNjUxYjU0MjY0OTUzZGM1ZDBlMzZhNWVhM2U4NTE2ZjY0NGExZjYwZTE5YTU2YTU1NTNjNzI0Il19.PVcWWTqJJuODFaXEHUuvnoQVkC-YWss9Vat3LycHEfc"; // Replace with dynamic token as needed

  // Fetch mention data when userHandle changes
  useEffect(() => {
    if (!webSocket || !userHandle) return;

    const payload = {
      request_type: "search_mentions",
      user_handle: userHandle,
      token,
    };

    setIsLoading(true);
    setMentions([]);

    webSocket.send(JSON.stringify(payload));

    webSocket.onmessage = (event: MessageEvent) => {
      try {
        const response: MentionApiResponse = JSON.parse(event.data);
        if (response?.data) {
          setMentions(response.data);
        }
      } catch (err) {
        console.error("Invalid WebSocket response:", err);
      } finally {
        setIsLoading(false);
      }
    };
  }, [token, userHandle, webSocket]);

  return (
    <>
      {!isLoading && mentions.length > 0 && (
        <div className="mention-list-wrapper">
          <ul>
            {mentions.map((mention, idx) => (
              <li key={idx} className="mention-item" onClick={() => onClick({ id: mention.user_handle })}>
                {mention.profile_image ? (
                  <AppImages imageUrl={mention.profile_image} alt="Profile Image" width={40} height={40} />
                ) : (
                  <img src="./images/icons/user_avatar.svg" alt="Default Avatar" width={40} height={40} />
                )}
                <div className="mention-content">
                  <strong>{mention.user_name}</strong>
                  <p>@{mention.user_handle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default MentionList;
