const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const dataTables = require('mongoose-datatables');

const secondInADay = 86400;

var PostSchema = new Schema({
    id: {type: String, unique: true},
    url: String,
    price: Number,
    description: String,
    image: String,
    phone: String
}, {
    timestamps: true
});

PostSchema.plugin(dataTables);

mongoose.connection.collection("posts").createIndex( { "createdAt": 1 }, { expireAfterSeconds: (secondInADay * 30) } )

module.exports = mongoose.model('Post', PostSchema);
