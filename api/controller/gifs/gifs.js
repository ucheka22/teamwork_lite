import pool from '../../config/pool';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import {
	createGifsQuery,
	searchGifById,
	deleteGifById,
	flagGifQuery,
	deleteFlaggedGifById
} from '../../models/gifs/sql';
import { commentsByGifId, createCommentQuery } from '../../models/comments/sql';
import validateGifInput from '../../validator/gif';
import isEmpty from '../../validator/isEmpty';

dotenv.config();

// Configure cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

class gifController {
	static getGifById(req, res, next) {
		// Get the gifId from the request params
		// Use it as a value in the query text
		// Search for gif with the ID
		const gifId = parseInt(req.params.gifId, 10);

		pool
			.query(searchGifById, [ gifId ])
			.then((result) => {
				if (result.rows.length > 0) {
					const { gifId, createdOn, title, imageUrl } = result.rows[0];
					pool
						.query(commentsByGifId, [ gifId ])
						.then((resultCom) => {
							return res.status(200).json({
								status: 'success',
								data: {
									id: gifId,
									createdOn,
									title,
									imageUrl: imageUrl.split(' ')[0],
									comments: resultCom.rows
								}
							});
						})
						.catch((err) => {
							console.log(err);
						});
				} else {
					return res.status(404).json({
						status: 'error',
						error: `Gif with Id ${gifId} not found`
					});
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}

	static async postGif(req, res, next) {
		// Validate user input

		try {
			let { title } = req.body;
			const error = validateGifInput(req.body);
			const isValid = isEmpty(error);
			if (!isValid) {
				return res.status(400).json({
					status: 'error',
					error: Object.values(error)[0]
				});
			}
			let image;
			if (req.file) {
				const result = await cloudinary.v2.uploader.upload(req.file.path, {
					public_id: `imageUploads/${req.file.originalname}`,
					use_filename: true,
					unique_filename: true
				});

				image = `${result.secure_url} ${result.public_id}`;
				let gif = await pool.query(createGifsQuery.createGif, [ title, image ]);

				if (gif.rows.length > 0) {
					const { gifId, createdOn, title, imageUrl } = gif.rows[0];
					return res.status(201).json({
						status: 'success',
						data: {
							message: 'Gif successfully posted',
							gifId,
							createdOn,
							title,
							imageUrl
						}
					});
				}
			}
			if (req.body.giphyUrl) {
				console.log(`${req.body.giphyUrl} ${req.body.giphyUrl}`);
				let gif = await pool.query(createGifsQuery.createGif, [
					title,
					`${req.body.giphyUrl} ${req.body.giphyUrl}`
				]);

				if (gif.rows.length > 0) {
					const { gifId, createdOn, title, imageUrl } = gif.rows[0];
					return res.status(201).json({
						status: 'success',
						data: {
							message: 'Gif successfully posted',
							gifId,
							createdOn,
							title,
							imageUrl
						}
					});
				} else {
					return res.status(400).json({
						status: 'error',
						error: 'No file selected from giphy api'
					});
				}
			}
			// if (!req.body.giphy && !req.file) {
			//
			// }
			// if (!req.body.giphy && !req.file) {
			// 	return res.status(400).json({
			// 		status: 'error',
			// 		error: 'You should select file from either gif collection'
			// 	});
			// }
		} catch (error) {
			return res.status(500).json({
				status: 'error',
				error: error.message
			});
		}
	}

	static async deleteGif(req, res, next) {
		// Get the Id of gif in params
		// Search for it in the database and delete it
		// Return a 201 response if deleted
		// and a 404 response if gif doesnt exist
		try {
			const gifId = parseInt(req.params.gifId, 10);
			const deletedGif = await pool.query(deleteGifById, [ gifId ]);
			if (deletedGif.rows.length > 0) {
				const public_Id = deletedGif.rows[0].imageUrl.split(' ')[1];

				cloudinary.v2.api.delete_resources([ public_Id ], (err, result) => {
					if (result) {
						return res.status(201).json({
							status: 'success',
							data: {
								message: 'Gif successfully deleted'
							}
						});
					}
					if (err) {
						throw err;
					}
				});
			} else {
				return res.status(404).json({
					status: 'error',
					error: 'Gif not found'
				});
			}
		} catch (error) {
			console.log(error);
		}
	}
	static postComment(req, res, next) {
		// GET gif ID from params
		// Fetch gif with the given ID
		// Use the Id to create a comment on comment table
		// Refactor validate comment inut
		const gifId = parseInt(req.params.gifId, 10);
		// Get ID of logged in user that wants to comment on the gif
		const { userId } = req.user;
		// Search for the gif with gifId
		const comment = req.body.comment;
		if (isEmpty(comment)) {
			return res.status(400).json({
				status: 'error',
				error: 'comment field cannot be empty'
			});
		}
		if (comment.length > 300) {
			return res.status(400).json({
				status: 'error',
				error: 'comment too lengthy'
			});
		}
		pool
			.query(searchGifById, [ gifId ])
			.then((result) => {
				if (result.rows.length > 0) {
					const { createdOn, imageUrl, title } = result.rows[0];
					// Create the comment and attach it to the response body
					pool
						.query(createCommentQuery.createComment, [ userId, , gifId, comment ])
						.then((commentRow) => {
							if (commentRow.rows.length > 0) {
								const { comment } = commentRow.rows[0];
								return res.status(201).json({
									status: 'success',
									data: {
										message: 'Comment successfully created',
										createdOn: createdOn,
										gifTitle: title,
										imageUrl: imageUrl.split(' ')[0],
										comment: comment
									}
								});
							} else {
								return res.status(500).json({
									status: 'error',
									error: err.message
								});
							}
						})
						.catch((err) => {
							return res.status(500).json({
								status: 'error',
								error: err.message
							});
						});
				} else {
					return res.status(404).json({
						status: 'error',
						error: 'Gif not found'
					});
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}
	static flagGif(req, res, next) {
		// GET THE ID of the gif to mark
		const gifId = parseInt(req.params.gifId, 10);
		// Search for the gif to see if it exists
		pool
			.query(searchGifById, [ gifId ])
			.then((result) => {
				if (result.rows.length > 0) {
					pool
						.query(flagGifQuery, [ gifId ])
						.then((flaggedGif) => {
							if (flaggedGif.rows.length > 0) {
								return res.status(201).json({
									status: 'success',
									data: {
										message: 'Gif has been flagged'
									}
								});
							}
						})
						.catch((err) => {
							console.log(err);
						});
				} else {
					return res.status(404).json({
						status: 'error',
						error: 'Gif not found'
					});
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}
	static deleteFlaggedGif(req, res, next) {
		const gifId = parseInt(req.params.gifId, 10);

		const adminEmail = req.user.email;

		if (adminEmail == process.env.ADMIN_EMAIL) {
			pool
				.query(deleteFlaggedGifById, [ gifId ])
				.then((result) => {
					if (result.rows.length > 0) {
						return res.status(201).json({
							status: 'success',
							data: {
								message: 'Gif successfully deleted'
							}
						});
					} else {
						return res.status(404).json({
							status: 'error',
							error: 'Gif not found or not flagged'
						});
					}
				})
				.catch((err) => {
					console.log(err);
				});
		} else {
			return res.status(401).json({
				status: 'error',
				error: 'Only admin can delete flagged gifs'
			});
		}
	}
}

export default gifController;
