package com.ssafy.hifive.domain.photo.entity;

import com.ssafy.hifive.domain.fanmeeting.entity.Fanmeeting;
import com.ssafy.hifive.domain.member.entity.Member;
import com.ssafy.hifive.global.entity.BaseTimeEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "photo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long photoId;

	@ManyToOne
	@JoinColumn(name = "fan_id", nullable = false)
	private Member fan;

	@ManyToOne
	@JoinColumn(name = "fanmeeting_id", nullable = false)
	private Fanmeeting fanmeeting;

	@Column(name = "photo_img")
	private String photoImg;

	@Column(name = "sequence")
	private int sequence;

	@Builder
	private Photo(Member fan, Fanmeeting fanmeeting, String photoImg, int sequence) {
		this.fan = fan;
		this.fanmeeting = fanmeeting;
		this.photoImg = photoImg;
		this.sequence = sequence;
	}
}
