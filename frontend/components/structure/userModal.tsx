import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { IChatMate, IChatUser } from '../content/chat/context';
import useSocketContext from '@/lib/socket';
import { useFetch } from '@/lib/hook';
import useAuthContext from '../user/auth';

enum ERelationType {
	FRIEND = "friend",
	BLOCK = "block",
};

interface IFriendRel {
	relation_id: number,
	relation_type: ERelationType,
	sender_id: number,
	receiver_id: number,
};

interface IRelationDto {
	senderId: number,
	receiverId: number,
};

const serverUrl = `${process.env.NEXT_PUBLIC_APP_SERVER_URL}`;
const relationUrl = `${serverUrl}/relation`;

const UserModal = ({ 
	targetUser,
	onClose,
	setUser,
	setShowProfile,
}: {
	targetUser: IChatMate,
	onClose: Function,
	setUser: React.Dispatch<React.SetStateAction<IChatUser>>,
	setShowProfile: React.Dispatch<React.SetStateAction<boolean>>,
}) => {
	const { chatSocket, gameSocket } = useSocketContext();
	const { user } = useAuthContext();

	const relContent: IRelationDto = {
		senderId: user.id,
		receiverId: targetUser.userId,
	};
	function offEvent(sockEvents: string[]) {
		for (const sockEvent of sockEvents) {
			chatSocket?.off(sockEvent);
		}
		onClose();
	}

	function handleEvent(evt: string, success: string, fail: string, content: any, handleSuccess: Function, handleFail: Function) {
		chatSocket?.on(success, (data: IChatUser) => {
			console.log(`dm success: ${data}`);
			offEvent([success, fail]);
			handleSuccess(data);
		});
		chatSocket?.on(fail, (msg) => {
			console.log(`${evt}: ${msg}`);
			handleFail(msg);
			offEvent([success, fail]);
		});
		chatSocket?.emit(evt, content);
	}

	function handleFriend() {
		const url = `${relationUrl}/${targetUser.isFriend ? 'remove' : 'add'}/friend`;
		fetch(url, {
			method: "POST",
			credentials: "include",
			body: JSON.stringify(relContent),
		})
		.then(res => {
				if (!res.ok) throw new Error(`invalid respone: ${res.status}`);
				return res.json();
		})
		.then(data => {
			onClose();
		})
		.catch(err => {
			console.log(`${url}: handleFriend error: ${err}`);
			alert('요청에 실패했습니다.');
			onClose();
		});
	}

	function handleBlock() {
		const url = `${relationUrl}/${targetUser.isBlocked ? 'remove' : 'add'}/block`;
		fetch(url, {
			method: "POST",
			credentials: "include",
			body: JSON.stringify(relContent),
		})
		.then(res => {
				if (!res.ok) throw new Error(`invalid respone: ${res.status}`);
				return res.json();
		})
		.then(data => {
			onClose();
		})
		.catch(err => {
			console.log(`${url}: handleFriend error: ${err}`);
			alert('요청에 실패했습니다.');
			onClose();
		});
	}

	function handleProfile() {
		onClose();
		setShowProfile(true);
	}

	function handleDm() {
		handleEvent('enter-dm-channel', 'enter-dm-success', 'enter-dm-fail', 
			targetUser.userId, 
			(data: IChatUser) => {setUser(data)},
			(msg: any) => {console.log(`enter-dm fail: ${msg}`); alert('오류: DM을 보낼 수 없습니다.');},
		)
	}

	// TODO waiting page?
	function handleGameNormal() {
		handleEvent('invite-game', 'invite-game-success', 'invite-game-fail',
			{targetUserId: targetUser.userId , gameMode: "NORMAL" ,},
			(data: any) => {console.log(`${data.user_nickname}에게 초대를 보냈습니다.`)},
			(msg: any) => {console.log(`invite-game fail: ${msg}`); alert('오류: 게임 초대를 보낼 수 없습니다.');},
		);
	}

	function handleGameFast() {
		handleEvent('invite-game', 'invite-game-success', 'invite-game-fail',
			{targetUserId: targetUser.userId , gameMode: "ADVANCED" ,},
			(data: any) => {console.log(`${data.user_nickname}에게 초대를 보냈습니다.`)},
			(msg: any) => {console.log(`invite-game fail: ${msg}`); alert('오류: 게임 초대를 보낼 수 없습니다.');},
		);
	}

  return (
		<ul>
			<li>
				<p>{targetUser.userNickName}</p>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleFriend}
					>{targetUser.isFriend ? 'unfollow' : 'follow'}</button>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleBlock}
					>{targetUser.isBlocked ? 'unblock' : 'block'}</button>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleProfile}
					>{'see profile'}</button>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleDm}
					>{'dm'}</button>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleGameNormal}
					>{'game normal'}</button>
			</li>
			<li>
				<button 
					className='normalButton'
					onClick={handleGameFast}
					>{'game fast'}</button>
			</li>
		</ul>

		/*
    <div className="modal">
      <div className="modal-content">
        <h3>유저 정보</h3>
        <p>유저 이름: {user.userNickName}</p>
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
		*/
  );
};
export default UserModal;
