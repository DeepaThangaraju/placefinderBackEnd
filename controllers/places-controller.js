
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs=require('fs')
const HttpError = require('../models/http-errors');

const Place = require('../models/places');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Could not find a place for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  console.log(userId)

  let userWithPlaces;
  try {
    userWithPlaces = await Place.find({creator:userId});
    // res.send(userWithPlaces)
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, please try again later.',
      500
    );
    return next(error);
  }
  
  if (!userWithPlaces ) {
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }
res.json( userWithPlaces);
  
};



const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, creator } = req.body;


  const createdPlace = new Place({
    title,
    description,
    address,
    image:req.file.path,
    creator
  });

  console.log(createdPlace)

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError('Creating place failed, please try again', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  console.log(user);

  try {

    let x=await createdPlace.save();
    let placeArr=[...user.places,x._id]
    let savePlace=await User.findByIdAndUpdate(user._id,{places:placeArr})
    if(!savePlace){
      res.status(400).send({err:"Not updated"})
    }else{
      res.send({msg:"Save Successfully"})
    }
  } catch (err) {
    const error = new HttpError(
      'Creating place failed, please try again.',
      500
    );
    return next(error);
  }

  // res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to edit this place.',
      401
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  console.log(placeId)

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
    console.log(place)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong??, could not delete place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find place for this id.', 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this place.',
      401
    );
    return next(error);
  }


  const imagePath=place.image;

  try {

    let x=await User.findById(place.creator);
    let placeArr=x.places.pull({_id:place._id});
    await User.findByIdAndUpdate(x._id,{places:placeArr})
    await place.remove()
     

  } catch (err) {
    const error = new HttpError(
      'deleting place failed, please try again.',
      500
    );
    return next(error);
  }
  fs.unlink(imagePath,err=>{
    console.log(err);
  })
  
  res.status(200).json({ message: 'Deleted place.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
