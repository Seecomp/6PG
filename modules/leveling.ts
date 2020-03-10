import { Message, GuildMember } from "discord.js";
// import Members from "../data/members";
import { GuildDocument } from "../models/guild";
import { MemberDocument } from "../models/member";
import DBWrapper from "../data/db-wrapper";
import Members from "../data/members";

export default class Leveling {
    static members: DBWrapper<MemberDocument, GuildMember> = new Members();

    static async validateXPMsg(msg: Message, guild: GuildDocument) {
        if (!msg?.member || !guild || Leveling.hasIgnoredXPRole(msg.member, guild)) {
            throw new Error('Member cannot earn XP');
        }

        const guildUser = await this.members.get(msg.member);
        if (!guildUser) return;

        const oldLevel = Leveling.xpInfo(guildUser.xpMessages, guild?.xp.xpPerMessage).level;
        guildUser.xpMessages++;
        const newLevel = Leveling.xpInfo(guildUser.xpMessages, guild?.xp.xpPerMessage).level;

        if (newLevel > oldLevel) {
            Leveling.handleLevelUp(msg, newLevel, guild);
        }
        guildUser.save();
    }
    private static hasIgnoredXPRole(member: GuildMember, guild: GuildDocument) {
        member.roles.cache.forEach(role => {            
            if (guild.xp.ignoredRoles.some(id => id == role.id)) {
                return true;
            }
        });
        return false;
    }

    private static handleLevelUp(msg: Message, newLevel: number, guild: GuildDocument) {
        msg.channel.send(`
            Level Up! ⭐\n**New Level**: \`${newLevel}\``);

        const levelRole = Leveling.getLevelRole(newLevel, guild);
        if (levelRole) {
            msg.member?.roles.add(levelRole);
        }
    }
    private static getLevelRole(level: number, guild: GuildDocument) {
        return guild.xp.levelRoles.find(r => r.level == level)?.role;
    }

    static xpInfo(messages: number, xpPerMessage: number) {
        const xp = xpPerMessage * messages;

        const preciseLevel = (-75 + Math.sqrt(Math.pow(75, 2) - 300 * (-150 - xp))) / 150;
        const level = ~~preciseLevel;

        const xpForNextLevel = this.xpForNextLevel(level, xp);
        return { level, exp: xp, xpForNextLevel };
    }
    private static xpForNextLevel(currentLevel: number, xp: number) {
        return ((75 * Math.pow(currentLevel + 1, 2)) + (75 * (currentLevel + 1)) - 150) - xp;
    }
}