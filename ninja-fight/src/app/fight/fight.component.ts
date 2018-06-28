import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { GlobalService } from '../global.service';
import { NinjaService, Ninja, Action } from '../ninja/ninja.service';
import { StoryService, Battle } from '../story/story.service';
import { EnemyAI } from '../ai/enemyai';

@Component({
  selector: 'app-fight',
  templateUrl: './fight.component.html',
  styleUrls: ['./fight.component.css']
})
export class FightComponent implements OnInit {

  title: string;

  battle: Battle;
  playerNinja: Ninja;
  opponentNinja: Ninja;

  enemyAI: EnemyAI;

  isPlayerAttackActive: boolean;
  isPlayerDefenceActive: boolean;
  isPlayerSpecialActive: boolean;

  isDecisionActive: boolean;
  playerChoice: Action;
  opponentChoice: Action;

  hoverAttack: boolean;
  hoverDefence: boolean;
  hoverSpecial: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private ninjaService: NinjaService,
    private globalService: GlobalService,
    private storyService: StoryService) {
      globalService.backgroundImage = "url(../assets/bg/fight-bg.jpg)";
    }

  ngOnInit() {
    const battleid = +this.route.snapshot.paramMap.get('battleid');
    const playerid = +this.route.snapshot.paramMap.get('playerid');
    const opponentid = +this.route.snapshot.paramMap.get('opponentid');
    this.battle = this.storyService.getBattle(battleid);
    this.playerNinja = this.ninjaService.getNinja(playerid);
    this.opponentNinja = this.ninjaService.getNinja(opponentid);
    this.enemyAI = new EnemyAI(this.opponentNinja, this.playerNinja);

    if (this.battle == null) {
      this.battle = new Battle(0);
    }
    this.turn("player");
  }

  turn(turn: string) {
    if(turn == "player") {
      this.playerTurn();
    }
    else if(turn == "opponent") {
      this.opponentTurn();
    }
    else if(turn == "decision") {
      this.decisionTurn();
    }
  }

  playerTurn() {
    this.title = "Your turn";

    let chakra = this.playerNinja.chakra.now;
    let chakraForAttack = this.playerNinja.attack.chakra;
    let chakraForDefence = this.playerNinja.defence.chakra;
    let chakraForSpecial = this.playerNinja.special.chakra;

    this.isPlayerAttackActive = (chakra >= chakraForAttack)? true : false;
    this.isPlayerDefenceActive = (chakra >= chakraForDefence)? true : false;
    this.isPlayerSpecialActive = (chakra >= chakraForSpecial)? true : false;

    this.isDecisionActive = false;
  }

  opponentTurn() {
    this.title = "Opponent's turn";

    this.isPlayerAttackActive = false;
    this.isPlayerDefenceActive = false;
    this.isPlayerSpecialActive = false;

    setTimeout(() => {
      var nextAction = this.enemyAI.nextMove();
      if(nextAction) {
        this.opponentPlays(nextAction.type);
      } else {
        this.opponentPlays("skip");
      }
    }, 2000)
  }

  decisionTurn() {
    this.title = "Result of this turn";

    this.isPlayerAttackActive = false;
    this.isPlayerDefenceActive = false;
    this.isPlayerSpecialActive = false;

    this.isDecisionActive = true;

    //remove chakra from Player Action
    let chakraSpentByPlayer = 0;
    if(this.playerChoice.type == "attack") {
      chakraSpentByPlayer += this.playerNinja.attack.chakra;
    } else if(this.playerChoice.type == "defence") {
      chakraSpentByPlayer += this.playerNinja.defence.chakra;
    } else if(this.playerChoice.type == "special") {
      chakraSpentByPlayer += this.playerNinja.special.chakra;
    }
    this.playerNinja.chakra.remove(chakraSpentByPlayer);

    //remove chakra from Opponent Action
    let chakraSpentByOpponent = 0;
    if(this.opponentChoice.type == "attack") {
      chakraSpentByOpponent += this.opponentNinja.attack.chakra;
    } else if(this.opponentChoice.type == "defence") {
      chakraSpentByOpponent += this.opponentNinja.defence.chakra;
    } else if(this.opponentChoice.type == "special") {
      chakraSpentByOpponent += this.opponentNinja.special.chakra;
    }
    this.opponentNinja.chakra.remove(chakraSpentByOpponent);

    //What is the result of this turn?
    // defence > attack & special

    //Player damage
    if(this.playerChoice.type == "attack" && this.opponentChoice.type != "defence") {
      this.opponentNinja.health.remove(this.playerNinja.attack.damage);
    } else if(this.playerChoice.type == "special" && this.opponentChoice.type != "defence") {
      this.opponentNinja.health.remove(this.playerNinja.special.damage);
    }

    //Opponent damage
    if(this.opponentChoice.type == "attack" && this.playerChoice.type != "defence") {
      this.playerNinja.health.remove(this.opponentNinja.attack.damage);
    } else if(this.opponentChoice.type == "special" && this.playerChoice.type != "defence") {
      this.playerNinja.health.remove(this.opponentNinja.special.damage);
    }

    let isPlayerDead = this.playerNinja.health.now <= 0;
    let isPlayerOutOfChakra = this.playerNinja.chakra.now <= 0;
    let isOpponentDead = this.opponentNinja.health.now <= 0;
    let isOpponentOutOfChakra = this.opponentNinja.chakra.now <= 0;
    let playerHealth = this.playerNinja.health.now;
    let opponentHealth = this.opponentNinja.health.now;

    //Anyone dead yet?
    if(isPlayerDead && !isOpponentDead) {
      this.lost();
      return;
    } else if(!isPlayerDead && isOpponentDead) {
      this.won();
      return;
    } else if(isPlayerDead && isOpponentDead) {
      this.draw();
      return;
    }
    //Anyone out of chakra?
    if(isPlayerOutOfChakra && !isOpponentOutOfChakra) {
      this.lost();
      return;
    } else if(!isPlayerOutOfChakra && isOpponentOutOfChakra) {
      this.won();
      return;
    } else if(isPlayerOutOfChakra && isOpponentOutOfChakra) {
      if(playerHealth > opponentHealth) {
        this.won();
        return;
      } else if(playerHealth < opponentHealth) {
        this.lost();
        return;
      } else if(playerHealth == opponentHealth) {
        this.draw();
        return;
      }
    }

    //Next turn
    setTimeout(() => {
      this.turn("player");
    }, 4000)
  }

  playerPlays(type: string) {
    if(type == "attack") {
      this.playerChoice = this.playerNinja.attack;
      this.playerNinja.attack.playSound();
    } else if(type == "defence") {
      this.playerChoice = this.playerNinja.defence;
      this.playerNinja.defence.playSound();
    } else if(type == "special") {
      this.playerChoice = this.playerNinja.special;
      this.playerNinja.special.playSound();
    }
    this.turn("opponent");
  }

  opponentPlays(type: string) {
    if(type == "attack") {
      this.opponentChoice = this.opponentNinja.attack;
    } else if(type == "defence") {
      this.opponentChoice = this.opponentNinja.defence;
    } else if(type == "special") {
      this.opponentChoice = this.opponentNinja.special;
    } else if(type == "skip") {
      this.opponentChoice = new Action('', '', 'skip');
    }
    this.turn("decision");
  }

  lost() {
    setTimeout(() => {
      this.router.navigateByUrl('/story/fight-result/'
      + this.battle.id + '/'
      + this.playerNinja.id + '/'
      + this.opponentNinja.id + '/lost');
    }, 2000)
  }

  won() {
    setTimeout(() => {
      if(this.storyService.isLastBattle(this.battle.id)) {
        this.router.navigateByUrl('/story/end');
      }
      else {
        this.router.navigateByUrl('/story/fight-result/'
        + this.battle.id + '/'
        + this.playerNinja.id + '/'
        + this.opponentNinja.id + '/won');
      }
    }, 2000)
  }

  draw() {
    setTimeout(() => {
      this.router.navigateByUrl('/story/fight-result/'
      + this.battle.id + '/'
      + this.playerNinja.id + '/'
      + this.opponentNinja.id + '/draw');
    }, 2000)
  }
}
