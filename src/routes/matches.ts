import {Router} from 'express';
import { Request, Response } from 'express';
import {createMatchSchema, listMatchesQuerySchema} from "../validation/matches";
import {db} from "../db/db";
import {matches} from "../db/schema";
import {getMatchStatus} from "../utils/match-status";
import {desc} from "drizzle-orm"


export const matchRouter: Router = Router();

const MAX_LIMIT = 100;


matchRouter.get("/", async (req:Request, res:Response) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if(!parsed.success){
        res.status(400).json({
            error: "Invalid query",
            details: parsed.error.issues,
        })
    }
    const limit = Math.min(parsed.data?.limit ?? 50, MAX_LIMIT);
    try {

        const data = await  db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit)

        res.status(200).json({data});
    }catch (e) {
        res.status(500).json({
            error: 'Failed to list matches',
        })
    }
});

// post request match
matchRouter.post("/", async (req:Request, res:Response) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if(!parsed.success){
        res.status(400).json({
            error: "Invalid payload",
            details: parsed.error.issues,
        })
    }
    // @ts-ignore
    const {data: {startTime,endTime,homeScore,awayScore} } = parsed;

    try {

        // @ts-ignore
       const  [event] = await Promise.all([db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime)
        }).returning()]);

       if (res.app.locals.broadcastMatchCreated) {

           try {
               res.app.locals.broadcastMatchCreated(event);
           }catch (err) {
               console.error('Failed to broadcast match creation:', err);
           }
       }

       res.status(200).json({
           status: "success",
           data: event,
       })
    } catch (err) {
        res.status(500).json({
            error: "Fail to create match",
            details: JSON.stringify(err),
        })
    }

})