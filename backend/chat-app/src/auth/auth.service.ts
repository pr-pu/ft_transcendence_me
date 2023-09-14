import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Observable, firstValueFrom } from 'rxjs';
import * as config from 'config';
import { AxiosRequestConfig } from 'axios';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { MailService } from './mail.service';

const dbconfig = config.get('intra');
const grant_type = dbconfig.get('grant_type');
const client_id = dbconfig.get('client_id');
const client_secret = dbconfig.get('client_secret');
const redirect_uri = dbconfig.get('redirect_uri');

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private httpService: HttpService,
		private mailService: MailService,
	) {}
	
	async signUp(code: string, res: Response) {
		try {
			const generateRandomString = async ( len: number) => {
				const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
				let randomString: string = '';
				for (let i = 0; i < len; i++) {
				const rnum = Math.floor(Math.random() * chars.length);
				randomString += chars.substring(rnum, rnum + 1);
				}
				const checkDuplicate = await this.userService.getProfileByNickName(randomString);
				
				console.log(checkDuplicate);

				if (checkDuplicate) {
					return generateRandomString(len);
				}
				console.log(randomString);
				return randomString;
			}
			const accessToken = await firstValueFrom(this.httpService.post(`https://api.intra.42.fr/oauth/token?grant_type=${grant_type}&client_id=${client_id}&client_secret=${client_secret}&code=${code}&redirect_uri=${redirect_uri}`).pipe());
			const axiosConfig: AxiosRequestConfig = {
				headers: {
				Authorization: `Bearer ${accessToken.data.access_token}`
				},
				withCredentials: true,
			}
			const user = await firstValueFrom(this.httpService.get('https://api.intra.42.fr/v2/me', axiosConfig).pipe());
			const payload = { username: user.data.login, id: user.data.id, two_factor_signed: false };
			const newAccessToken = this.jwtService.sign({ payload });
			const found = await this.userService.getProfileByUserId(user.data.id);

			res.cookie('token', newAccessToken, { maxAge: 60*60*1000, httpOnly: true, sameSite: 'lax' });
			if (found) { 
				res.send("sendCookie");
				return ;
			}

			const createUserDto: CreateUserDto = {
				user_id: user.data.id,
				username: user.data.login,
				nickname: await generateRandomString(12),
				email: user.data.email,
				avatar: "Temporary Avator",
			};

			this.userService.createUser(createUserDto);
			res.send();
			return;
		} catch (err) {
			console.log(`signUp error: ${err}`);
		}
		return ;
	}

	async checkLoginState(req: Request, res: Response) {
		try {
			const token = req.cookies['token'];

			if (!token) {
			  res.json({ loggedIn: false });
				return;
			}
			const { payload } = this.jwtService.verify(token);
			
			const found = await this.userService.getProfileByUserId(payload.id);	// 토큰에 해당하는 유저찾기
			if (!found) { // 잘못된 토큰 -> 토큰 삭제
				res.json({ loggedIn: false});
				return;
			}
			const two_factor = await this.userService.getTwoFactorByUserId(payload.id);
			if (two_factor) {	// 2차인증 ON & 2차인증 안한상태 => 메일보내기
				if (payload.two_factor_signed === false) {
					const clientEmail = await this.userService.getEmailByUserId(payload.id);
					const verificationCode = await this.mailService.secondAuthentication(clientEmail);
					console.log(verificationCode);
				}
			}
			payload.two_factor_signed = true;
			const newToken = this.jwtService.sign({ payload });
			res.cookie('token', newToken, {
				httpOnly: true,
				maxAge: 60 * 60 * 1000,// milli seconds
				sameSite: 'lax',
			});
			res.json({ loggedIn: true, user: payload });
		} catch (err) {
			console.log(`checkLoginState error: ${err}`);
			res.json({ loggedIn: false, error: true});
		}
		return;
	}

	signOut(res: Response) {
		res.clearCookie('token').json({ message: "Signned Out" });
	}
}
