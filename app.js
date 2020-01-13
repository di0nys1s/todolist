//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const request = require("request");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.set("useFindAndModify", false);
mongoose.connect(
  "mongodb+srv://admin-john:Bs26072013@cluster0-d7evf.mongodb.net/todolistDB",
  {
    // mongoose.connect("mongodb://localhost:27017/todolistDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

const day = new Date().getDate();
const month = new Date().getMonth() + 1;
const year = new Date().getFullYear();
const hour = new Date().getHours();

const date = " - " + day + "/" + month + "/" + year;

const itemSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "To do list item name is required."]
  }
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Welcome Rose to your List!"
});
const item2 = new Item({
  name: "Use submit and delete buttons to add and remove item."
});
const item3 = new Item({
  name: "Create new list via adding /<list-name> to your url."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemSchema]
};

const List = mongoose.model("List", listSchema);

let bwTemp = 0;
let sunriseHour = 0;
let sunsetHour = 0;
app.get("/", function(req, res) {
  request(
    "http://api.openweathermap.org/data/2.5/weather?q=Melbourne,au&APPID=eebb82456e95e58d67552ad0e1ad6cf9",
    function(error, response, body) {
      var data = JSON.parse(body);
      var currentTemperature = data.main.temp;
      var sunriseTimestamp = data.sys.sunrise;
      var sunsetTimestamp = data.sys.sunset;
      var hourSunrise = new Date(sunriseTimestamp * 1000).getHours();
      var hourSunset = new Date(sunsetTimestamp * 1000).getHours();
      bwTemp = Math.round(currentTemperature - 273);
      sunriseHour = hourSunrise;
      sunsetHour = hourSunset;
      console.log(bwTemp);
      console.log(sunriseHour);
      console.log(sunsetHour);
    }
  );

  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems,
        date: date,
        temperature: bwTemp,
        sunrise: sunriseHour,
        sunset: sunsetHour,
        hour: hour
      });
    }
  });
});

app.post("/", function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res) {
  // const checkedItemId = req.body.checkbox;
  const deletedItemId = req.body.delete;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(deletedItemId, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate(
      // find the list name
      { name: listName },
      // update part
      // pull the items array having id equals to id
      // coming from checkbox
      // this is a mongodb pull method to get the
      // array items from mongodb
      { $pull: { items: { _id: deletedItemId } } },
      function(err, foundList) {
        if (!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  // check whether the name exists or not in the db
  List.findOne({ name: customListName }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        // Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        // Show and existing list
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
          date: date
        });
      }
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully at port 3000");
});
