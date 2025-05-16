if(process.env.NODE_ENV !="production") {
    require("dotenv").config();
}
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const userRouter = require("./routes/user.js");
const {isLoggedIn, isReviewAuthor} = require("./middleware.js")
const multer = require("multer");
const{storage} = require("./cloudconfig.js");
const upload = multer({storage})


//const MONGO_URL="mongodb://localhost:27017/wanderlust"
const  dbUrl =process.env.ATLASDB_URL;
const path = require("path");
const review = require("./models/review.js");
const user = require("./models/user.js");
main()
.then(() => {
    console.log("connected to DB");
})
.catch ((err) => {
    console.log(err);
})
async function main() {
    await mongoose.connect(dbUrl,await mongoose.connect(process.env.ATLASDB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: true
 } ))

}
app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"))
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")))

const store =MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
   secret:process.env.SECRET ,
  },
  touchAfter:24*3600,
}); 

const sessionOptions = {
  store,
    secret: process.env.SECRET,
    resave: false, 
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 *1000,
      maxAge : 7 * 24 * 60 * 60 *1000,
      httpOnly: true,
    }
}
store.on("error",() => {
  console.log("error in MONGO_SESSION_STORE",err);
})

// app.get("/", (req, res) => {
//     res.send("Hi i am root ")
// })


app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()) );

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
       res.locals.success = req.flash("success");
       res.locals.error = req.flash("error");
       res.locals.currentUser = req.user;
       next();
})

// app.get("/demouser", async(req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com", 
//         username:"delta-student",
//     })
//      let registeredUser = await User.register(fakeUser,"helloworld");
//      res.send(registeredUser);
// })

//  app.get("/testlisting",async (req, res) => {
//     let samplelisting = new Listing ({
//         title: "my new villa",
//         description:"my the beach", 
//         price : 12000, 
//         location: "calcangute, Goa", 
//         country: "India", 
//     })

//     await samplelisting.save();
//     console.log("sample was saved");
//     res.send("successful")
//  })

app.get("/listings",wrapAsync(async (req, res) => {
   const allListings = await Listing.find({})
  res.render("listings/index.ejs", { allListings });

}))
 app.get("/listings/sort", async (req, res) => {
  const { order } = req.query;
  const sortOrder = order === "desc" ? -1 : 1;
  const allListings = await Listing.find({}).sort({ price: sortOrder });
  res.render("listings/index", { allListings });
});
// Show price filter form
app.get("/listings/pricefilter", (req, res) => {
  res.render("listings/price"); // new filter form page
});

// Handle filter results
app.get("/listings/pricefilter/results", async (req, res) => {
  const { min, max } = req.query;
  const allListings = await Listing.find({
    price: { $gte: parseInt(min), $lte: parseInt(max) }
  });
  res.render("listings/index.ejs", { allListings });
});
// whislist route:
app.post("/wishlist/:id", async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const listingId = req.params.id;

  if (!userId) {
    return res.status(401).send("You must be logged in to use wishlist.");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const index = user.wishlist.indexOf(listingId);
    let action;

    if (index === -1) {
      // 👉 Add to wishlist
      user.wishlist.push(listingId);
      action = "added";
      req.flash("success","added to whislist!");
    } else {
      // 👉 Remove from wishlist
      user.wishlist.splice(index, 1);
      action = "removed";
      req.flash("success","Removed from whislist");
    }

    await user.save();
    res.status(200).json({ status: "success", action });
  } catch (err) {
    console.error("Wishlist toggle error:", err);
    res.status(500).send("Error saving to wishlist");
  }
});


app.get("/listings/new",isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
})
app.get("/listings/:id",wrapAsync (async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews", populate: {
        path:"author"
    },
})
.populate("owner");
    if(!listing) {
        req.flash("error", " Warning:Listing Does not exist!");
       return res.redirect("/listings");
    }
    res.render("listings/show.ejs",{listing});
}))
app.post("/listings/:id/reviews",isLoggedIn,async(req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    let {id} = req.params;
    newReview.author = req.user._id;
    listing.reviews.push(newReview);


    await newReview.save();
    await listing.save();
    console.log("done");
    req.flash("success", "New Review Created!");
    res.redirect(`/listings/${id}`);
})
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn,isReviewAuthor,wrapAsync(async(req,res)=> {
     let{id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id, {$pull: { reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", " Review Deleted!");
    res.redirect(`/listings/${id}`);
    })
)


app.post("/listings",isLoggedIn,upload.single("listing[image]"),wrapAsync(async(req,res,next)=> {
     
      let url = req.file.path;
      let filename = req.file.filename;
       const newListing = new Listing(req.body.listing);
      newListing.image ={url, filename};
        newListing.owner = req.user._id;
        await newListing.save();
        req.flash("success","New Listing Created!");
       res.redirect("/listings");
   
}));


app.get("/listings/:id/edit" ,isLoggedIn, wrapAsync(async(req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", " Warning:Listing Does not exist!");
       return res.redirect("/listings");
      
    }
    res.render("listings/edit.ejs", { listing });
}))
app.put("/listings/:id" ,isLoggedIn,upload.single("listing[image]"), wrapAsync(async (req, res) => {

    let { id } = req.params;
     let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing})
     
     if(typeof req.file !=="undefined") {
     let url = req.file.path;
      let filename = req.file.filename;
      listing.image = {url, filename};
      await listing.save();
      };
   req.flash("success","Listing Updated!");
   res.redirect(`/listings/${id}`);
}))
app.delete("/listings/:id",isLoggedIn, wrapAsync(async(req,res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success","Listing Deleted!");
    res.redirect("/listings");
}))

app.get("/search", async (req, res) => {
    const { q } = req.query;

    try {
        const listings = await Listing.find({
            $or:[
           { title: { $regex: q, $options: "i" }},
             { location: { $regex: q, $options: "i" } },
        { country: { $regex: q, $options: "i" } }
        ] // Case-insensitive partial match
        }).sort({ title: 1 }); // Alphabetical sort

        res.json(listings);
    } catch (err) {
        res.status(500).json({ message: "Search failed", error: err });
    }
});

app.get("/listings/pricefilter", (req, res) => {
    res.render("listings/price.ejs")
    // res.redirect("/listings")
})

app.get("/listings/category/:categoryName", async (req, res) => {
  
  // if (req.session.user_id) {
  //   currentUser = await User.findById(req.session.user_id);
  // }

  const { categoryName } = req.params;
   req.flash("success", `You are viewing: ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}`);
  const allListings = await Listing.find({ category: categoryName });

  res.render("listings/index.ejs", { allListings });
  
});



app.get("/wishlist", async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
   const mongoose = require("mongoose");
  // cast to ObjectId

  try {
    const userId =  new mongoose.Types.ObjectId(req.user._id)
    const populatedUser = await User.findById(userId).populate("wishlist");

    if (!populatedUser) {
      return res.status(404).send("User not found.");
    }

    res.render("listings/wishlist.ejs", { listings: populatedUser.wishlist });
  } catch (err) {
    console.error("Wishlist page error:", err);
    res.status(500).send("Something went wrong.");
  }
});






app.use("/", userRouter);

app.all("/*any", (req, res, next) => {
    next(new ExpressError(404," page not found!") )
});
app.use((err, req, res, next) => {
    let{statusCode = 500, message = "something went wrong"} = err;
    res.status(statusCode).render("listings/error.ejs", {err});
//    res.status(statusCode).send(message);
})
app.listen(8080, () => {
    console.log("server is listing on port8080");

})


