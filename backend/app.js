const express = require("express");
const multer = require("multer");
const axios = require("axios");
const { PDFParse } = require("pdf-parse");
const cors = require("cors");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
  })
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/grades", upload.single("file"), async (req, res) => {
  const { dept, number } = req.query;
  if (!req.file) return res.status(400).send("No file uploaded");

  try {
    let fileContent;

    if (req.file.mimetype === "application/pdf") {
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      fileContent = result.text;
    } else if (
      req.file.mimetype === "text/plain" ||
      req.file.originalname.endsWith(".txt")
    ) {
      fileContent = req.file.buffer.toString("utf-8");
    } else {
      return res
        .status(400)
        .send("Unsupported file type. Please upload PDF or TXT");
    }

    const response = await axios.post(
      "https://anex.us/grades/getData/",
      `dept=${dept}&number=${number}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://anex.us",
          Referer: `https://anex.us/grades/?dept=${dept}&number=${number}`,
        },
      }
    );

    let classesArray = [];
    if (Array.isArray(response.data.classes)) {
      classesArray = response.data.classes.slice(-3);
    } else {
      console.warn("Unexpected classes format:", response.data);
    }

    const prompt = `You are a Texas A&M University advisor analyzing course difficulty for a student.

STUDENT'S TRANSCRIPT:
${fileContent}

COURSE: ${dept} ${number}
RECENT GRADE DISTRIBUTION DATA:
${JSON.stringify(classesArray, null, 2)}

Based on the student's academic history and performance in related courses shown in their transcript, and considering the recent grade distribution, provide a concise analysis of:

1. Likely difficulty (Easy, Moderate, Challenging, Very Challenging)
2. Relevant prerequisites from the transcript
3. Any gaps that may make it harder
4. Their chances of earning an (A, B, C, D, and F) AS A PERCENTAGE

Keep your response concise (100-200 words). Keep each reply CONCISE AND BRIEF. Don't use pronouns like "you" and don't say "the student" or anything, just make the statement. 

Ouput your reply like this (ADHERE TO THIS FORMAT STRICTLY DONT ADD ANYTHING EXTRA AT THE END MAKE SURE ITS ALL UNIFORM FOR EVERYSINGLE COURSE):
**Likely Difficulty**: <difficulty here>

**Relevant prerequisites**: <info here>

**Gaps**: <gaps info here>

**Grade Probability**: **A**: <percentage chance here> **B**: <percentage chance here> **C**: <percentage chance here> **D**: <percentage chance here> **F**: <percentage chance here>
`;

    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a Texas A&M University academic advisor analyzing course difficulty based on transcripts and grade distributions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    res.json({
      aiAnalysis: gptResponse.data.choices[0].message.content,
      classes: response.data.classes,
    });
  } catch (err) {
    console.error(err.message);
    console.error(err.response?.data);
    res.status(500).send("Error processing file: " + err.message);
  }
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
