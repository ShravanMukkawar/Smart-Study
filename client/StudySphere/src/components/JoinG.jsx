import React, { useState, useEffect } from "react";
import Input from "./Input";
import GroupCard2 from "./GroupCard2.jsx";
import { Comment } from "react-loader-spinner";
import axios from "axios";
import stringSimilarity from "string-similarity";


const apiUrl = "http://localhost:5000";

function JoinG() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [item, setItem] = useState("");

const handleSearch = async () => {
  setLoading(true);
  try {
    // Step 1: Send question to FastAPI + LLM backend
    const response = await axios.post("http://127.0.0.1:8000/getgroups", {
      question: item,
    });

    const groupText = response.data.response;

    // Step 2: Extract group names from LLM response
    const matchedGroupNames = groupText
      .split("\n")
      .filter((line) => /^\d+\.\s/.test(line))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim());

    console.log("Matched groups from LLM:", matchedGroupNames);

    // Step 3: Fetch all groups
    const data = await axios.get(`${apiUrl}/api/v1/group/getG`, {
      withCredentials: true,
    });

    const allGroups = data.data.data;

    const filteredGroups = allGroups.filter((group) =>
      matchedGroupNames.some((name) => {
        const score = stringSimilarity.compareTwoStrings(
          group.name.toLowerCase(),
          name.toLowerCase()
        );
        return score > 0.4; // adjust threshold based on quality
      })
    )

    setGroups(filteredGroups);

    if (filteredGroups.length === 0) {
      console.warn("No groups matched LLM response. Consider refining query.");
    }

  } catch (error) {
    console.error("Failed to search groups !!", error);
  } finally {
    setLoading(false);
  }
};

  // Fetch all groups initially
  useEffect(() => {
    setLoading(true);
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/v1/group/getG`, {
          withCredentials: true,
        });

        if (!res) {
          throw new Error("Failed to fetch groups");
        }
        setGroups(res.data.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return loading ? (
    <div className="flex min-h-[calc(100vh-5vw)] justify-center items-center bg-gradient-to-r from-slate-400 to-slate-800">
      <Comment
        visible={true}
        height="80"
        width="80"
        ariaLabel="comment-loading"
        wrapperStyle={{}}
        wrapperClass="comment-wrapper"
        color="#fff"
        backgroundColor="#F4442E"
      />
    </div>
  ) : (
    <div className="flex flex-col min-h-[calc(100vh-5vw)] items-center bg-gradient-to-r from-slate-400 to-slate-800">
      {/* Search Bar */}
      <div className="relative flex justify-center items-center gap-[1vw] mt-[2vw]">
        <div className="relative">
          <Input
            className="shine-effect h-[3vw] w-[25vw] pl-[1vw] pr-[4vw] text-black rounded-full focus:outline-none shadow-lg"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Search for groups"
          />
          <div className="shine-glow"></div>
        </div>
        <button
          className="h-[3vw] w-[3vw] bg-blue-600 rounded-full flex justify-center items-center shadow-lg transform hover:scale-110 transition-transform duration-300 ease-in-out"
          onClick={handleSearch}
        >
          <img
            src="https://static-00.iconduck.com/assets.00/search-icon-2048x2048-cmujl7en.png"
            alt="search"
            className="h-[50%] w-[50%]"
          />
        </button>
      </div>

      {/* Group Cards */}
      <ul className="flex flex-wrap justify-center max-w-[100%] px-[2vw] gap-[1vw] min-h-[40vw] mt-[1vw]">
        {groups
          .filter((card) => card.leader && card.leader.fullName)
          .map((card) => (
            <li key={card._id}>
              <GroupCard2
                name={card.name}
                description={card.description}
                tags={card.tags}
                category={card.category}
                leader={card.leader.fullName}
                id={card._id}
              />
            </li>
          ))}
      </ul>
    </div>
  );
}

export default JoinG;
