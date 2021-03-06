import { gifObj } from '../objects';
export const dropGifTable = 'DROP TABLE IF EXISTS gifs CASCADE';
export const gifsTable = `CREATE TABLE gifs(
    "gifId" SERIAL PRIMARY KEY NOT NULL,
    "createdOn" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "imageUrl" VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    flagged BOOLEAN DEFAULT false 
)`;
export const searchGifById = `SELECT * FROM gifs WHERE "gifId" = $1`;
export const deleteGifById = `DELETE FROM gifs WHERE "gifId" = $1 RETURNING *`;
const createGif = `INSERT INTO gifs(title,"imageUrl") VALUES($1,$2) RETURNING *`;
const gifValues = [ gifObj.imageUrl, gifObj.title ];
export const flagGifQuery = `UPDATE gifs SET flagged = true WHERE "gifId" = $1 RETURNING *`;
export const deleteFlaggedGifById = `DELETE FROM gifs WHERE "gifId" = $1 AND flagged = true RETURNING *`;
export const createGifsQuery = {
	createGif,
	gifValues
};
