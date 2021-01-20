const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

var PostSchema = new Schema({
    id: {type: String, unique: true},
    url: String,
    price: Number,
    description: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', PostSchema);
