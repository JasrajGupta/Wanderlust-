const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js")

const listingSchema = new Schema({
    title:{
        type:String,
        required:true,
    }, 
    description: {
        type: String, 
        required: true,
    },
   
        image: {
            filename: {type: String }, 
            url: { type: String,
                required: true,
        }
   
    },
    price: {
        type:Number, 
        required: true,
    },
    location:{
        type: String,
        required: true,
    },

    country: {
        type:String, 
        required: true,
    },
    reviews: [
       { type: Schema.Types.ObjectId,
        ref: "Review",
       },
    ],
    owner: {
        type:Schema.Types.ObjectId,
        ref:"User",
    },
   category: {
  type: String,
  enum: [
    "adventure",
    "beaches",
    "cultural",
    "ecotourism",
    "hill stations",
    "historical",
    "luxury",
    "natural wonders",
    "spiritual",
    "wildlife",
   
  ],
   },
      
})

listingSchema.post("findOneAndDelete", async ( listing) => {
    if(listing ) {
        await Review.deleteMany({_id : {$in: listing.reviews}})
    }
   
})
const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;