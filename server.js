import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import md5 from "md5";
import jsonwebtoken from "jsonwebtoken";
import { serialize } from "cookie";
// Create express app
// var express = require("express");
var app = express();
// var db = require("./database.js");
// var cors = require("cors");
// var md5 = require("md5");
// Server port
const { sign, verify } = jsonwebtoken;
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
var HTTP_PORT = 8000;
const secret = "Temporary secret,change this in .env";
app.use(express.json());

const prisma = new PrismaClient();
// Start server
app.listen(HTTP_PORT, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT));
});
app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Credentials", "true");
  // res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  // res.header(
  //   "Access-Control-Allow-Headers",
  //   "X-Requested-With,X-PINGOTHER, Content-Type"
  // );
  // res.header(
  //   "Access-control-expose-headers",
  //   "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
  // );
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  res.header("Access-Control-Allow-Methods", "Set-Cookie");

  next();
});
// Root endpoint
app.get("/", (req, res, next) => {
  res.json({ message: "Ok" });
});
app.get("/user", async (req, res, next) => {
  try {
    console.log(req.headers.cookie.split("="));
    const cookie = req.headers.cookie.split("=")[1];
    var decoded = verify(cookie, secret);
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
      },
    });
    console.log(user);
    res.status(200).json({
      message: "Ok",
      fname: user.fname,
      lname: user.lname,
      uname: user.uname,
    });
  } catch (error) {
    res.status(404).json({ message: "error" });
  }
});

app.post("/setcookie", (req, res) => {
  // res.cookie(`Cookie token name`, `encrypted cookie string Value`);
  // res.send("Cookie have been saved successfully");
  // console.log("hi");
  // res.setHeader("Set-Cookie", "serialised");
  res.cookie("token", "token", { httpOnly: true }).send("hi");
  // res.status(200).json({ message: "Ok" });
});

app.post("/reg", async (req, res, next) => {
  var errors = [];
  if (!req.body.password) {
    errors.push("No password specified");
  }
  if (!req.body.username) {
    errors.push("No username specified");
  }
  if (!req.body.firstname) {
    errors.push("No firstname specified");
  }
  if (!req.body.lastname) {
    errors.push("No lastname specified");
  }
  if (req.body.username.length < 4) {
    errors.push("username is too short");
  }
  if (req.body.password.length < 6) {
    errors.push("password is too short");
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(",") });
    return;
  }
  var data = {
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    username: req.body.username,
    password: md5(req.body.password),
  };
  try {
    const reg = await prisma.user.create({
      data: {
        fname: data.firstname,
        lname: data.lastname,
        uname: data.username,
        password: data.password,
      },
    });
    res.json({
      message: "success",
    });
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.post("/login", async (req, res, next) => {
  var errors = [];
  if (!req.body.password) {
    errors.push("No password specified");
  }
  if (!req.body.username) {
    errors.push("No username specified");
  }

  if (req.body.username.length < 4) {
    errors.push("username is too short");
  }
  if (req.body.password.length < 6) {
    errors.push("password is too short");
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(",") });
    return;
  }
  var data = {
    username: req.body.username,
    password: md5(req.body.password),
  };
  try {
    const user = await prisma.user.findFirst({
      where: {
        uname: data.username,
        password: data.password,
      },
    });
    console.log(!!user);
    console.log(user);
    if (!!user) {
      const token = sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
          username: data.username,
          name: user.fname,
          id: user.id,
        },
        secret
      );
      const serialised = serialize("OurSiteJWT", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV != "development",
        // sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      // console.log("correct");
      // res.setHeader("Set-Cookie", serialised).json({
      //   message: "success",
      // });
      res
        .setHeader("Set-Cookie", serialised)
        .writeHead(200, {
          "Set-Cookie": serialised,
        })
        .send();
    } else {
      res.status(400).json({ error: "User doesnt exist" });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
});

app.get("/logout", async (req, res, next) => {
  const token = sign(
    {
      exp: 0,
    },
    secret
  );
  const serialised = serialize("OurSiteJWT", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV != "development",
    // sameSite: "strict",
    maxAge: -1,
    path: "/",
  });
  // console.log("correct");
  // res.setHeader("Set-Cookie", serialised).json({
  //   message: "success",
  // });
  res
    .setHeader("Set-Cookie", serialised)
    .writeHead(200, {
      "Set-Cookie": serialised,
    })
    .send();
});
app.get("/", (req, res, next) => {
  res.json({ message: "Ok" });
});
// Insert here other API endpoints

// Default response for any other request
app.use(function (req, res) {
  res.status(404);
});
