const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.tu4i6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ridemate-5d791.web.app",
      "https://ride-mate.netlify.app",
      "https://ridemate-5d791.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access." });
  }
  // verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access." });
    }
    req.user = decoded;

    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carsCollection = client.db("carsDB").collection("cars");
    const carsBookedCollection = client.db("carsDB").collection("carsBooked");

    // __________Auth related API___________
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // _______________Cars API_______________
    // create data from client side
    app.post("/cars", async (req, res) => {
      const newCar = req.body;
      console.log(newCar);
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
    });

    // get data for cars route
    app.get("/cars", async (req, res) => {
      const cursor = carsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation to find single car using id
    app.get("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.findOne(query);
      res.send(result);
    });

    // get operation to find specific email user cars
    app.get("/cars/myCars/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };

      if (req.user.email !== req.params.email) {
        return res.status(403), send({ message: "Forbidden access" });
      }

      const result = await carsCollection.find(query).toArray();
      res.send(result);
    });

    // update operation
    app.put("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const carUpdateData = req.body;
      const update = {
        $set: {
          userName: carUpdateData.userName,
          userEmail: carUpdateData.userEmail,
          carModel: carUpdateData.carModel,
          dailyPrice: carUpdateData.dailyPrice,
          regNo: carUpdateData.regNo,
          description: carUpdateData.description,
          features: carUpdateData.features,
          vehiclePhotoURL: carUpdateData.vehiclePhotoURL,
          location: carUpdateData.location,
          bookingCount: carUpdateData.bookingCount,
          available: carUpdateData.available,
          datePosted: carUpdateData.datePosted,
        },
      };
      const result = await carsCollection.updateOne(filter, update, options);
      res.send(result);
    });

    // delete a car from received _id
    app.delete("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.send(result);
    });

    // ___________________BOOKINGS API_______

    // create data from client side
    app.post("/carsBooking", async (req, res) => {
      const newCarBooking = req.body;
      const result = await carsBookedCollection.insertOne(newCarBooking);

      {
        // getting bookingCount
        // const id = newCarBooking.car_id;
        // const query = { _id: new ObjectId(id) };
        // const car = await carsCollection.findOne(query);
        // let newCount = 0;
        // if (car.bookingCount) {
        //   newCount = car.bookingCount + 1;
        // } else {
        //   newCount = 1;
        // }
        // // updating bookingCount
        // const filter = { _id: new ObjectId(id) };
        // const updatedDoc = {
        //   $set: {
        //     bookingCount: newCount,
        //   },
        // };
      }

      // increase booking count in carsCollection

      const filter = { _id: new ObjectId(newCarBooking.car_id) };
      const update = {
        $inc: { bookingCount: 1 },
      };
      const updateBookingCount = await carsCollection.updateOne(filter, update);

      res.send(result);
    });

    // get data for carsBooking route
    app.get("/carsBooking", async (req, res) => {
      const cursor = carsBookedCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation to find single booked car using id
    app.get("/carsBooking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsBookedCollection.findOne(query);
      res.send(result);
    });

    // delete booking using received _id
    app.delete("/carsBooking/:id", async (req, res) => {
      const idDelete = req.params.id;
      const queryDelete = { _id: new ObjectId(idDelete) };
      const result = await carsBookedCollection.deleteOne(queryDelete);

      res.send(result);
    });

    // get operation to find specific email user cars
    app.get("/carsBooking/myBookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { bookedBy: email };

      if (req.user.email !== req.params.email) {
        return res.status(403), send({ message: "Forbidden access" });
      }

      const result = await carsBookedCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/carsBooking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateCarBooking = req.body;
      const update = {
        $set: {
          startDateTime: updateCarBooking.startDateTime,
          endDateTime: updateCarBooking.endDateTime,
          subTotal: updateCarBooking.subTotal,
        },
      };
      const result = await carsBookedCollection.updateOne(
        filter,
        update,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// checking the server is working or not in local host
app.get("/", (req, res) => {
  res.send("Server is Working");
});

// in CMD
app.listen(port, () => {
  console.log(`Server is running in port ${port}`);
});
