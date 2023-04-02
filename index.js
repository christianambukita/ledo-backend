const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const userName = process.env.DB_USERNAME;
const userPassword = process.env.DB_PASSWORD;
const databaseName = process.env.DB_CLUSTER;
const PORT = process.env.PORT || 3333;

const app = express();

app.use(cors());
app.use(express.json());

const problemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  grade: {
    type: String,
    required: true
  },
  grips: {
    type: Object,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date
  }
});

problemSchema.pre("save", function (next) {
  if (!this.timestamp) {
    this.timestamp = Date.now();
  }
  next();
});

const Problem = mongoose.model("problems_collection", problemSchema);

app.get("/problem-list", async (req, res) => {
  try {
    const problemList = await Problem.find();
    return res.json({ problemList });
  } catch (err) {
    console.error("Error getting problem list", err);
    return res.status(500).end();
  }
});

app.post("/problem", async (req, res) => {
  const problem = new Problem(req.body);
  try {
    await problem.save();
    return res.status(200).end();
  } catch (err) {
    console.error("Error saving problem", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Problem name must be unique" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

app.patch("/problem", async (req, res) => {
  const id = req.query.id;
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "grade", "grips", "author", "comment"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates!" });
  }

  try {
    const problem = await Problem.findOne({ _id: id });

    if (!problem) {
      return res.status(404).send();
    }

    updates.forEach((update) => (problem[update] = req.body[update]));
    console.log({ updates, problem, body: req.body });
    await problem.save();
    res.send(problem);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.delete("/problem", (req, res) => {
  const { id } = req.query;

  Problem.findOneAndDelete({ _id: id })
    .then((result) => {
      if (!result) {
        res.status(404).send(`Problem with id ${id} not found`);
        return;
      }
      res.status(200).send(`Problem with id ${id} deleted`);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send(`Error deleting problem with id ${id}`);
    });
});

mongoose
  .connect(
    `mongodb+srv://${userName}:${userPassword}@${databaseName}.skhneed.mongodb.net/?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
