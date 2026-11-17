var isClicked = false;
var isShowed = false;

function demo1(){
	var up = document.getElementById("container1");
	//var upbag = document.getElementById("demo1");
	var down=document.getElementById("main");
	$('#main').rotate3Di('flip',3000);
}

function transform(){
	if(isClicked){
		document.getElementById('main').style.transform='perspective(2000px) translateX(0) rotateY(0deg)';
		document.getElementById('nav').style.transform='translateX(-120px)';
	}
	else{
		document.getElementById('main').style.transform='perspective(2000px) translateX(120px) rotateY(30deg)';
		document.getElementById('nav').style.transform='translateX(0)';
	}
	isClicked=!isClicked;
}

function show(id){
	if(isShowed){
		document.getElementById("main").style.filter='blur(0px)';
		document.getElementById("nav").style.filter='blur(0px)';
		document.getElementById("ov-btmleft").style.display='none';
		$('.overlay>:first-child').attr('src','#');
	}
	else{
		document.getElementById("main").style.filter='blur(10px)';
		document.getElementById("nav").style.filter='blur(10px)';
		document.getElementById("ov-btmleft").style.display='inline';
		if(id=="banner1")
			$('.overlay>:first-child').attr('src','https://player.youku.com/embed/XOTE2NTkwNzI4');
		else if(id=="banner2")
			$('.overlay>:first-child').attr('src','https://player.youku.com/embed/XNzI5MTIwMjk2');
		else if(id=="banner3")
			$('.overlay>:first-child').attr('src','https://www.nowcoder.com/ta/coding-interviews?page=1');
		else
			$('.overlay>:first-child').attr('src','//player.bilibili.com/player.html?isOutside=true&aid=23570119&bvid=BV1Pp411f72E&cid=39342140&p=1');
	}
	isShowed=!isShowed;
}

$('document').ready(function(){
		$('.nav_btn').hover(function(){
			if(!isClicked){
				$("#main").css('transform','perspective(2000px) translateX(10px) rotateY(2deg)');
				$("#nav").css('transform','translateX(-110px)');
			}},function(){
			if(!isClicked){
				$("#main").css('transform','perspective(2000px) translateX(0) rotateY(0)');
				$("#nav").css('transform','translateX(-120px)');
			}
		});
		$(".nav_btn").click(function(){
			if(!isClicked){
				$("#main").css('transform','perspective(2000px) translateX(120px) rotateY(15deg)');
				$("#nav").css('transform','translateX(0)');
			}
			else{
				$("#main").css('transform','perspective(2000px) translateX(0) rotateY(0)');
				$("#nav").css('transform','translateX(-120px)');
			}
			isClicked=!isClicked;
		});
		$(".c_box").click(function(){
			show($(this).attr('id'));
		});
	}
	);
	
