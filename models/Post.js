const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const dataTables = require('mongoose-datatables');

var PostSchema = new Schema({
    id: {type: String, unique: true},
    url: String,
    price: Number,
    description: String,
    image: String
}, {
    timestamps: true
});

PostSchema.plugin(dataTables);

module.exports = mongoose.model('Post', PostSchema);
