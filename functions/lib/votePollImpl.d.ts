import * as functions from "firebase-functions";
interface VotePollData {
    pollId: string;
    optionIndex: number;
}
interface VotePollResult {
    success: boolean;
    reward: number;
    newBalance: number;
    newLifetime: number;
}
export declare const votePoll: (data: VotePollData, context: functions.https.CallableContext) => Promise<VotePollResult>;
export {};
//# sourceMappingURL=votePollImpl.d.ts.map